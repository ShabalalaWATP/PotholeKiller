import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NetlifyDB } from "@netlify/database-dev";
import pg from "pg";
import { fileURLToPath } from "node:url";
import { databaseCommunityRepository as repository } from "../lib/community/database";
import { issueScanReceipt } from "../lib/community/receipts";

const holder = vi.hoisted(() => ({ pool: undefined as pg.Pool | undefined }));
vi.mock("@netlify/database", () => ({ getDatabase: () => ({ pool: holder.pool }) }));

const userA = "a4b638dd-81ca-4ec9-8177-5195ffda702b";
const userB = "b6b3a058-4b28-4259-a6af-b47a2f198eaa";
const userC = "c8a185d7-10f2-4c4e-b931-d1a5c788d9e8";
const now = new Date("2026-11-01T15:15:00.000Z");
const profileA = { displayName: "O'Neil", avatar: "gremlin" as const, published: true };
const hash = (index: number) => index.toString(16).padStart(64, "0");
let database: NetlifyDB;

beforeAll(async () => {
  database = new NetlifyDB({ logger: () => undefined });
  const connectionString = await database.start();
  await database.applyMigrations(fileURLToPath(new URL("../netlify/database/migrations", import.meta.url)));
  holder.pool = new pg.Pool({ connectionString, max: 4, idleTimeoutMillis: 1000, connectionTimeoutMillis: 5000 });
}, 30_000);

afterAll(async () => {
  await holder.pool?.end();
  await database?.stop();
}, 15_000);

beforeEach(async () => {
  // This is the test-owned in-memory database, never a hosted connection.
  await database.exec("TRUNCATE collector_captures, scan_receipts, collector_profiles CASCADE");
});

async function collect(userId: string, imageHash: string, awardedXp = 60) {
  const receipt = await repository.issueReceipt(userId, imageHash, now);
  return repository.claimCapture(userId, { receiptId: receipt.receiptId, preparedAtISO: now.toISOString(), awardedXp }, now);
}

describe("committed collector schema and parameterised queries", () => {
  it("applies the migration and updates only the SDK-selected profile, including apostrophes safely", async () => {
    expect(await repository.getProfile(userA)).toBeNull();
    await repository.saveProfile(userA, profileA);
    await repository.saveProfile(userB, { displayName: "Other Player", avatar: "beast", published: false });
    await repository.saveProfile(userA, { ...profileA, displayName: "Crater O'Neil" });
    expect(await repository.getProfile(userA)).toEqual({ ...profileA, displayName: "Crater O'Neil", captures: 0, xp: 0 });
    expect(await repository.getProfile(userB)).toMatchObject({ displayName: "Other Player", published: false });
  });

  it("derives standings from distinct captures, orders count before XP and excludes private collectors", async () => {
    await repository.saveProfile(userA, profileA);
    await repository.saveProfile(userB, { displayName: "High Bonus", avatar: "beast", published: true });
    await repository.saveProfile(userC, { displayName: "Private Player", avatar: "puddle", published: false });
    await collect(userA, hash(1));
    await collect(userA, hash(2));
    await collect(userB, hash(3), 110);
    await collect(userC, hash(4));
    await collect(userC, hash(5));
    await collect(userC, hash(6));
    const leaderboard = await repository.leaderboard();
    expect(leaderboard.map(row => [row.displayName, row.captures, row.xp])).toEqual([["O'Neil", 2, 120], ["High Bonus", 1, 110]]);
    expect(await repository.getProfile(userC)).toMatchObject({ captures: 3, xp: 180 });
  });

  it("stores no photo, precise location, report body, email or password columns", async () => {
    const columns = await database.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name IN ('collector_profiles', 'scan_receipts', 'collector_captures')",
    );
    expect(columns.rows.map(row => row.column_name)).not.toEqual(expect.arrayContaining(["photo", "latitude", "longitude", "body", "email", "password"]));
    expect(columns.rows.some(row => /photo|latitude|longitude|report_body|email|password/.test(row.column_name))).toBe(false);
  });
});

describe("receipt ownership, expiry and atomic once-only claims", () => {
  beforeEach(async () => {
    await repository.saveProfile(userA, profileA);
    await repository.saveProfile(userB, { displayName: "Other Player", avatar: "beast", published: true });
  });

  it("binds each unexpired receipt to its authenticated owner", async () => {
    const receipt = await repository.issueReceipt(userA, hash(1), now);
    expect(receipt.receiptId).toMatch(/^[a-f0-9-]{36}$/);
    expect(receipt.expiresAt).toBe("2026-11-01T15:45:00.000Z");
    await expect(repository.claimCapture(userB, { receiptId: receipt.receiptId, preparedAtISO: now.toISOString(), awardedXp: 60 }, now)).rejects.toMatchObject({ status: 400, code: "RECEIPT_UNAVAILABLE" });
    expect(await repository.getProfile(userB)).toMatchObject({ captures: 0, xp: 0 });
    expect(await repository.claimCapture(userA, { receiptId: receipt.receiptId, preparedAtISO: now.toISOString(), awardedXp: 60 }, now)).toEqual({ awardedXp: 60, duplicate: false });
  });

  it("rejects expired receipts and rolls back without adding a capture", async () => {
    const receipt = await repository.issueReceipt(userA, hash(1), now);
    const afterExpiry = new Date(now.getTime() + 30 * 60_000);
    await expect(repository.claimCapture(userA, { receiptId: receipt.receiptId, preparedAtISO: now.toISOString(), awardedXp: 60 }, afterExpiry)).rejects.toMatchObject({ code: "RECEIPT_UNAVAILABLE" });
    expect(await repository.getProfile(userA)).toMatchObject({ captures: 0, xp: 0 });
  });

  it("deduplicates a photograph across different receipts and never upgrades its frozen award", async () => {
    const first = await repository.issueReceipt(userA, hash(1), now);
    const second = await repository.issueReceipt(userA, hash(1), now);
    expect(await repository.claimCapture(userA, { receiptId: first.receiptId, preparedAtISO: now.toISOString(), awardedXp: 60 }, now)).toEqual({ awardedXp: 60, duplicate: false });
    expect(await repository.claimCapture(userA, { receiptId: second.receiptId, preparedAtISO: now.toISOString(), awardedXp: 110 }, now)).toEqual({ awardedXp: 0, duplicate: true });
    expect(await repository.claimCapture(userA, { receiptId: first.receiptId, preparedAtISO: now.toISOString(), awardedXp: 110 }, now)).toEqual({ awardedXp: 0, duplicate: true });
    expect(await repository.getProfile(userA)).toMatchObject({ captures: 1, xp: 60 });
  });

  it("allows each collector to collect a distinct photo once, without a global counter race", async () => {
    await collect(userA, hash(1));
    await collect(userB, hash(1));
    expect(await repository.getProfile(userA)).toMatchObject({ captures: 1, xp: 60 });
    expect(await repository.getProfile(userB)).toMatchObject({ captures: 1, xp: 60 });
  });

  it("requires a deliberately saved profile while permitting receipt issuance before profile creation", async () => {
    const receipt = await repository.issueReceipt(userC, hash(1), now);
    await expect(repository.claimCapture(userC, { receiptId: receipt.receiptId, preparedAtISO: now.toISOString(), awardedXp: 60 }, now)).rejects.toMatchObject({ status: 409, code: "PROFILE_REQUIRED" });
    await repository.saveProfile(userC, { displayName: "New Player", avatar: "crackling", published: false });
    expect(await repository.claimCapture(userC, { receiptId: receipt.receiptId, preparedAtISO: now.toISOString(), awardedXp: 60 }, now)).toMatchObject({ awardedXp: 60 });
  });

  it("enforces receipt owner/hash consistency and XP bounds in the database itself", async () => {
    const receipt = await repository.issueReceipt(userA, hash(1), now);
    await expect(database.query(
      "INSERT INTO collector_captures (user_id, image_hash, receipt_id, awarded_xp, prepared_at, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [userB, hash(1), receipt.receiptId, 60, now.toISOString(), now.toISOString()],
    )).rejects.toMatchObject({ code: "23503" });
    await expect(repository.claimCapture(userA, { receiptId: receipt.receiptId, preparedAtISO: now.toISOString(), awardedXp: 99999 }, now)).rejects.toMatchObject({ code: "23514" });
    expect(await repository.getProfile(userA)).toMatchObject({ captures: 0, xp: 0 });
    expect(await collect(userA, hash(2))).toMatchObject({ awardedXp: 60 });
  });
});

describe("server-only receipt adapter", () => {
  it("validates Identity UUIDs and server image hashes before inserting", async () => {
    await expect(issueScanReceipt("client-supplied-name", hash(1))).rejects.toThrow();
    await expect(issueScanReceipt(userA, "photo.jpg")).rejects.toThrow();
    const receipt = await issueScanReceipt(userA, hash(1));
    const stored = await database.query<{ user_id: string; image_hash: string; lifetime: number }>(
      "SELECT user_id, image_hash, EXTRACT(EPOCH FROM (expires_at - created_at))::integer AS lifetime FROM scan_receipts WHERE id = $1", [receipt.receiptId],
    );
    expect(stored.rows).toEqual([{ user_id: userA, image_hash: hash(1), lifetime: 1800 }]);
  });
});
