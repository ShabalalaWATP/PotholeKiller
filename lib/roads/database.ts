import { randomUUID } from "node:crypto";
import { getDatabase } from "@netlify/database";
import { RequestFailure } from "../security/errors";
import type { RoadRepository } from "./repository";
import { isCommunityFixed, reportOrderBonus, voteWeight } from "./rules";
import { RoadIssueSchema, type RoadIssue } from "./schema";

interface Client {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{ rows: Row[] }>;
  release(): void;
}
type IssueRow = {
  id: string; label: string; latitude: number; longitude: number; defect_type: string;
  monster_profile: unknown; created_at: Date | string; status: "open" | "community_fixed";
  confirmation_points: number; confirmation_count: number; report_count: number;
};

function project(row: IssueRow): RoadIssue {
  return RoadIssueSchema.parse({
    id: row.id, label: row.label, location: { lat: row.latitude, lng: row.longitude },
    type: row.defect_type, monsterProfile: row.monster_profile,
    createdAtISO: new Date(row.created_at).toISOString(), status: row.status,
    confirmationPoints: row.confirmation_points, confirmationCount: row.confirmation_count, reportCount: row.report_count,
  });
}

async function transaction<T>(operation: (client: Client) => Promise<T>): Promise<T> {
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pending: Promise<Client> = getDatabase().pool.connect();
  void pending.then(client => { if (expired) client.release(); }).catch(() => undefined);
  const client = await Promise.race([pending, new Promise<never>((_, reject) => {
    timer = setTimeout(() => { expired = true; reject(new Error("Road database unavailable")); }, 5000);
  })]).finally(() => clearTimeout(timer));
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '5000ms'");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

async function issue(client: Client, id: string, lock = false): Promise<IssueRow> {
  const { rows } = await client.query<IssueRow>(`SELECT * FROM road_issues WHERE id = $1${lock ? " FOR UPDATE" : ""}`, [id]);
  if (!rows[0]) throw new RequestFailure(404, "ROAD_ISSUE_NOT_FOUND", "That shared road issue could not be found.");
  return rows[0];
}

function metresBetween(first: { lat: number; lng: number }, second: { lat: number; lng: number }): number {
  const radians = Math.PI / 180;
  const deltaLat = (second.lat - first.lat) * radians;
  const deltaLng = (second.lng - first.lng) * radians;
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(first.lat * radians) * Math.cos(second.lat * radians) * Math.sin(deltaLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export const databaseRoadRepository: RoadRepository = {
  async list() {
    return transaction(async client => {
      const { rows } = await client.query<IssueRow>("SELECT * FROM road_issues ORDER BY CASE WHEN status = 'open' THEN 0 ELSE 1 END, created_at DESC, id LIMIT 200");
      return rows.map(project);
    });
  },
  async publish(userId, input, now) {
    return transaction(async client => {
      // Lock the claimed capture so retries cannot publish it as multiple issues.
      const capture = await client.query<{ awarded_xp: number; canonical_receipt_id: string }>(
        `SELECT c.awarded_xp, c.receipt_id AS canonical_receipt_id
         FROM scan_receipts s JOIN collector_captures c ON c.user_id = s.user_id AND c.image_hash = s.image_hash
         WHERE s.id = $1 AND s.user_id = $2 FOR UPDATE OF c`, [input.receiptId, userId],
      );
      if (!capture.rows[0]) throw new RequestFailure(403, "OWNED_CAPTURE_REQUIRED", "Claim your own live capture before publishing its road pin.");
      const canonicalReceipt = capture.rows[0].canonical_receipt_id;
      const shared = await client.query<{ issue_id: string; reporter_ordinal: number }>(
        "SELECT issue_id, reporter_ordinal FROM road_issue_reports WHERE capture_receipt_id = $1", [canonicalReceipt],
      );
      if (shared.rows[0]) {
        if (input.existingIssueId && input.existingIssueId !== shared.rows[0].issue_id) {
          throw new RequestFailure(409, "CAPTURE_ALREADY_SHARED", "This capture is already linked to a different road issue.");
        }
        return { issue: project(await issue(client, shared.rows[0].issue_id)), duplicate: true, reportBonusXp: 0, reporterOrdinal: shared.rows[0].reporter_ordinal };
      }
      const issueId = input.existingIssueId ?? randomUUID();
      let reporterOrdinal = 1;
      if (input.existingIssueId) {
        const existing = await issue(client, issueId, true);
        if (metresBetween(input.location, { lat: existing.latitude, lng: existing.longitude }) > 100) {
          throw new RequestFailure(400, "ROAD_ISSUE_TOO_FAR", "Select a matching issue within 100 metres of the confirmed defect pin.");
        }
        if (existing.status !== "open") throw new RequestFailure(409, "ROAD_ISSUE_CLOSED", "That issue is already community confirmed fixed. Publish a new issue if damage has returned.");
        const previous = await client.query<{ reporter_ordinal: number }>(
          "SELECT reporter_ordinal FROM road_issue_reports WHERE issue_id = $1 AND user_id = $2", [issueId, userId],
        );
        if (previous.rows[0]) return { issue: project(existing), duplicate: true, reportBonusXp: 0, reporterOrdinal: previous.rows[0].reporter_ordinal };
        // Allocate with UPDATE RETURNING as well as the row lock: never calculate
        // an ordinal from an earlier read while other publications are waiting.
        const allocated = await client.query<{ report_count: number }>(
          "UPDATE road_issues SET report_count = report_count + 1 WHERE id = $1 AND status = 'open' RETURNING report_count", [issueId],
        );
        if (!allocated.rows[0]) throw new RequestFailure(409, "ROAD_ISSUE_CLOSED", "That issue is already community confirmed fixed.");
        reporterOrdinal = allocated.rows[0].report_count;
      } else {
        await client.query(
          `INSERT INTO road_issues (id, label, latitude, longitude, defect_type, monster_profile, created_at)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
          [issueId, input.label, input.location.lat, input.location.lng, input.type, JSON.stringify(input.monsterProfile), now.toISOString()],
        );
      }
      const inserted = await client.query<{ reporter_ordinal: number; report_bonus: number }>(
        `INSERT INTO road_issue_reports (issue_id, user_id, capture_receipt_id, capture_xp, reporter_ordinal, report_bonus, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (issue_id, user_id) DO NOTHING RETURNING reporter_ordinal, report_bonus`,
        [issueId, userId, canonicalReceipt, capture.rows[0].awarded_xp, reporterOrdinal, reportOrderBonus(reporterOrdinal), now.toISOString()],
      );
      if (!inserted.rows.length && input.existingIssueId) {
        await client.query("UPDATE road_issues SET report_count = report_count - 1 WHERE id = $1", [issueId]);
      }
      const original = inserted.rows[0] ?? (await client.query<{ reporter_ordinal: number }>(
        "SELECT reporter_ordinal FROM road_issue_reports WHERE issue_id = $1 AND user_id = $2", [issueId, userId],
      )).rows[0];
      return {
        issue: project(await issue(client, issueId)), duplicate: inserted.rows.length === 0,
        reportBonusXp: inserted.rows[0]?.report_bonus ?? 0, reporterOrdinal: original.reporter_ordinal,
      };
    });
  },
  async confirmFixed(userId, roles, issueId, now) {
    return transaction(async client => {
      // All counters, threshold transition and rewards share this row lock/transaction.
      const existing = await issue(client, issueId, true);
      const inserted = await client.query<{ vote_weight: number }>(
        `INSERT INTO road_issue_repair_votes (issue_id, user_id, vote_weight, created_at)
         VALUES ($1, $2, $3, $4) ON CONFLICT (issue_id, user_id) DO NOTHING RETURNING vote_weight`,
        [issueId, userId, voteWeight(roles), now.toISOString()],
      );
      if (!inserted.rows[0]) return { issue: project(existing), duplicate: true, rewardAwarded: false };
      const points = existing.confirmation_points + inserted.rows[0].vote_weight;
      const crossed = existing.status === "open" && isCommunityFixed(points);
      await client.query(
        "UPDATE road_issues SET confirmation_points = $2, confirmation_count = confirmation_count + 1, status = $3 WHERE id = $1",
        [issueId, points, crossed ? "community_fixed" : existing.status],
      );
      let rewardAwarded = false;
      if (crossed) {
        const rewarded = await client.query<{ user_id: string }>(
          `INSERT INTO collector_repair_rewards (issue_id, user_id, bonus_xp, created_at)
           SELECT issue_id, user_id, capture_xp + report_bonus, $2 FROM road_issue_reports WHERE issue_id = $1
           ON CONFLICT (issue_id, user_id) DO NOTHING RETURNING user_id`, [issueId, now.toISOString()],
        );
        rewardAwarded = rewarded.rows.length > 0;
      }
      return { issue: project(await issue(client, issueId)), duplicate: false, rewardAwarded };
    });
  },
};
