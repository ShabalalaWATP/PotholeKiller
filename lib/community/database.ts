import { randomUUID } from "node:crypto";
import { getDatabase } from "@netlify/database";
import { CommunityFailure } from "./errors";
import type { CommunityRepository } from "./repository";
import type { ProfileInput, ProfileStats } from "./schema";

type Database = ReturnType<typeof getDatabase>;
// Both documented SDK pool drivers expose this parameterised promise API.
interface Client {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string, values?: unknown[],
  ): Promise<{ rows: Row[] }>;
  release(): void;
}
async function openConnection(database: Database): Promise<Client> {
  return database.pool.connect();
}
type ProfileRow = { display_name: string; avatar: ProfileInput["avatar"]; published: boolean; captures: number; xp: number };
type ReceiptRow = { image_hash: string };

function profile(row: ProfileRow): ProfileStats {
  return { displayName: row.display_name, avatar: row.avatar, published: row.published, captures: row.captures, xp: row.xp };
}

async function connection(database: Database): Promise<Client> {
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pending = openConnection(database);
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      expired = true;
      reject(new Error("Community database connection timed out."));
    }, 5000);
  });
  void pending.then(client => { if (expired) client.release(); }).catch(() => undefined);
  try {
    return await Promise.race([pending, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Each operation uses one connection and a bounded database statement timeout. */
async function transaction<T>(operation: (client: Client) => Promise<T>): Promise<T> {
  const client = await connection(getDatabase());
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '5000ms'");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export const databaseCommunityRepository: CommunityRepository = {
  async getProfile(userId) {
    return transaction(async client => {
      const { rows } = await client.query<ProfileRow>(
        `SELECT p.display_name, p.avatar, p.published,
           (SELECT COUNT(*)::integer FROM collector_captures c WHERE c.user_id = p.id) AS captures,
           ((SELECT COALESCE(SUM(c.awarded_xp), 0) FROM collector_captures c WHERE c.user_id = p.id)
             + (SELECT COALESCE(SUM(reports.report_bonus), 0) FROM road_issue_reports reports WHERE reports.user_id = p.id)
             + (SELECT COALESCE(SUM(r.bonus_xp), 0) FROM collector_repair_rewards r WHERE r.user_id = p.id))::integer AS xp
         FROM collector_profiles p
         WHERE p.id = $1`, [userId],
      );
      return rows[0] ? profile(rows[0]) : null;
    });
  },
  async leaderboard() {
    return transaction(async client => {
      const { rows } = await client.query<ProfileRow>(
        `SELECT p.display_name, p.avatar, p.published,
           (SELECT COUNT(*)::integer FROM collector_captures c WHERE c.user_id = p.id) AS captures,
           ((SELECT COALESCE(SUM(c.awarded_xp), 0) FROM collector_captures c WHERE c.user_id = p.id)
             + (SELECT COALESCE(SUM(reports.report_bonus), 0) FROM road_issue_reports reports WHERE reports.user_id = p.id)
             + (SELECT COALESCE(SUM(r.bonus_xp), 0) FROM collector_repair_rewards r WHERE r.user_id = p.id))::integer AS xp
         FROM collector_profiles p
         WHERE p.published = TRUE
         ORDER BY captures DESC, xp DESC, p.created_at ASC, p.id ASC
         LIMIT 20`,
      );
      return rows.map(profile);
    });
  },
  async saveProfile(userId, input) {
    await transaction(async client => {
      await client.query(
        `INSERT INTO collector_profiles (id, display_name, avatar, published)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name,
           avatar = EXCLUDED.avatar, published = EXCLUDED.published`,
        [userId, input.displayName, input.avatar, input.published],
      );
    });
  },
  async claimCapture(userId, input, now) {
    return transaction(async client => {
      const profile = await client.query("SELECT id FROM collector_profiles WHERE id = $1", [userId]);
      if (profile.rows.length === 0) throw new CommunityFailure(409, "PROFILE_REQUIRED", "Save your collector profile before sharing a capture.");
      // The row lock and database unique constraints make concurrent retries idempotent.
      const receipt = await client.query<ReceiptRow>(
        `SELECT image_hash FROM scan_receipts
         WHERE id = $1 AND user_id = $2 AND expires_at > $3
         FOR UPDATE`, [input.receiptId, userId, now.toISOString()],
      );
      if (!receipt.rows[0]) throw new CommunityFailure(400, "RECEIPT_UNAVAILABLE", "This live scan receipt is invalid or expired. Scan the photograph again.");
      const inserted = await client.query<{ awarded_xp: number }>(
        `INSERT INTO collector_captures (user_id, image_hash, receipt_id, awarded_xp, prepared_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING RETURNING awarded_xp`,
        [userId, receipt.rows[0].image_hash, input.receiptId, input.awardedXp, input.preparedAtISO, now.toISOString()],
      );
      return inserted.rows[0]
        ? { awardedXp: inserted.rows[0].awarded_xp, duplicate: false }
        : { awardedXp: 0, duplicate: true };
    });
  },
  async issueReceipt(userId, imageHash, now) {
    const receiptId = randomUUID();
    const expiresAt = new Date(now.getTime() + 30 * 60_000).toISOString();
    await transaction(async client => {
      await client.query(
        "INSERT INTO scan_receipts (id, user_id, image_hash, created_at, expires_at) VALUES ($1, $2, $3, $4, $5)",
        [receiptId, userId, imageHash, now.toISOString(), expiresAt],
      );
    });
    return { receiptId, expiresAt };
  },
};
