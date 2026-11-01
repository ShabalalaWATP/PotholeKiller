import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { NetlifyDB } from "@netlify/database-dev";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { databaseCommunityRepository as collectors } from "../lib/community/database";
import { databaseRoadRepository as roads } from "../lib/roads/database";
import type { PublishRoadIssue } from "../lib/roads/schema";

const holder = vi.hoisted(() => ({ pool: undefined as pg.Pool | undefined }));
vi.mock("@netlify/database", () => ({ getDatabase: () => ({ pool: holder.pool }) }));
const userA = "a4b638dd-81ca-4ec9-8177-5195ffda702b";
const userB = "b6b3a058-4b28-4259-a6af-b47a2f198eaa";
const now = new Date("2026-11-01T15:40:00.000Z");
let database: NetlifyDB;
let hashIndex = 0;

beforeAll(async () => {
  database = new NetlifyDB({ logger: () => undefined });
  const connectionString = await database.start();
  await database.applyMigrations(fileURLToPath(new URL("../netlify/database/migrations", import.meta.url)));
  holder.pool = new pg.Pool({ connectionString, max: 6, idleTimeoutMillis: 1000, connectionTimeoutMillis: 5000 });
}, 30_000);
afterAll(async () => { await holder.pool?.end(); await database?.stop(); }, 15_000);
beforeEach(async () => {
  // All fixtures and truncation are confined to this test-owned in-memory database.
  await database.exec("TRUNCATE collector_repair_rewards, road_issue_repair_votes, road_issue_reports, road_issues, collector_captures, scan_receipts, collector_profiles");
  for (const [id, displayName] of [[userA, "Original Reporter"], [userB, "Second Reporter"]]) {
    await collectors.saveProfile(id, { displayName, avatar: "gremlin", published: false });
  }
});

async function capture(userId = userA, awardedXp = 60, imageHash?: string) {
  const hash = imageHash ?? (++hashIndex).toString(16).padStart(64, "0");
  const receipt = await collectors.issueReceipt(userId, hash, now);
  await collectors.claimCapture(userId, { receiptId: receipt.receiptId, preparedAtISO: now.toISOString(), awardedXp }, now);
  return { ...receipt, hash };
}
function publication(receiptId: string, existingIssueId?: string): PublishRoadIssue {
  return { action: "publish", receiptId, existingIssueId, label: "Mare Street, public road pin", location: { lat: 51.5452, lng: -0.0559 }, type: "medium", monsterProfile: { extent: "medium", firstObservedOn: null } };
}

describe("vital shared-road ownership and repair transactions", () => {
  it("publishes only an owned claimed capture and deduplicates new receipts for the same photograph", async () => {
    const original = await capture();
    await expect(roads.publish(userB, publication(original.receiptId), now)).rejects.toMatchObject({ code: "OWNED_CAPTURE_REQUIRED" });
    const rescan = await collectors.issueReceipt(userA, original.hash, now);
    const first = await roads.publish(userA, publication(rescan.receiptId), now);
    expect(first.duplicate).toBe(false);
    expect(first).toMatchObject({ reportBonusXp: 60, reporterOrdinal: 1 });
    expect(await roads.publish(userA, publication(original.receiptId), now)).toMatchObject({ duplicate: true, reportBonusXp: 0, reporterOrdinal: 1, issue: { id: first.issue.id, reportCount: 1 } });
    expect(await roads.list()).toHaveLength(1);
    const linked = await database.query<{ capture_receipt_id: string }>("SELECT capture_receipt_id FROM road_issue_reports");
    expect(linked.rows[0].capture_receipt_id).toBe(original.receiptId);
  });

  it("links only an explicit nearby issue, counts each reporter once and preserves each first award", async () => {
    const first = await roads.publish(userA, publication((await capture(userA, 70)).receiptId), now);
    const other = await capture(userB, 90);
    await expect(roads.publish(userB, { ...publication(other.receiptId, first.issue.id), location: { lat: 51.6, lng: -0.1 } }, now)).rejects.toMatchObject({ code: "ROAD_ISSUE_TOO_FAR" });
    expect(await roads.publish(userB, publication(other.receiptId, first.issue.id), now)).toMatchObject({ issue: { reportCount: 2 }, duplicate: false });
    const repeat = await capture(userB, 110);
    expect(await roads.publish(userB, publication(repeat.receiptId, first.issue.id), now)).toMatchObject({ issue: { reportCount: 2 }, duplicate: true });
    const stored = await database.query<{ capture_xp: number }>("SELECT capture_xp FROM road_issue_reports WHERE issue_id = $1 AND user_id = $2", [first.issue.id, userB]);
    expect(stored.rows[0].capture_xp).toBe(90);
  });

  it("does not clear on one council vote, reaches five with3+1+1 and awards each reporter once", async () => {
    const first = await roads.publish(userA, publication((await capture(userA, 70)).receiptId), now);
    await roads.publish(userB, publication((await capture(userB, 90)).receiptId, first.issue.id), now);
    const council = randomUUID();
    expect(await roads.confirmFixed(council, ["council_verified"], first.issue.id, now)).toMatchObject({ issue: { status: "open", confirmationPoints: 3, confirmationCount: 1 }, rewardAwarded: false });
    expect(await roads.confirmFixed(council, ["council_verified"], first.issue.id, now)).toMatchObject({ duplicate: true, issue: { confirmationPoints: 3 } });
    expect((await roads.confirmFixed(randomUUID(), [], first.issue.id, now)).issue.status).toBe("open");
    expect(await roads.confirmFixed(randomUUID(), [], first.issue.id, now)).toMatchObject({ issue: { status: "community_fixed", confirmationPoints: 5, confirmationCount: 3 }, rewardAwarded: true });
    expect(await roads.confirmFixed(randomUUID(), [], first.issue.id, now)).toMatchObject({ rewardAwarded: false, issue: { confirmationPoints: 6 } });
    const rewards = await database.query<{ user_id: string; bonus_xp: number }>("SELECT user_id, bonus_xp FROM collector_repair_rewards ORDER BY user_id");
    expect(rewards.rows).toEqual([{ user_id: userA, bonus_xp: 130 }, { user_id: userB, bonus_xp: 110 }]);
    expect((await collectors.getProfile(userA))?.xp).toBe(260);
    expect((await collectors.getProfile(userB))?.xp).toBe(220);
    await expect(roads.publish(userB, publication((await capture(userB)).receiptId, first.issue.id), now)).rejects.toMatchObject({ code: "ROAD_ISSUE_CLOSED" });
  });

  it("serialises concurrent threshold crossings and duplicate retries without double bonuses", async () => {
    const first = await roads.publish(userA, publication((await capture(userA, 60)).receiptId), now);
    await roads.confirmFixed(randomUUID(), ["council_verified"], first.issue.id, now);
    const actor = randomUUID();
    await roads.confirmFixed(actor, [], first.issue.id, now);
    const results = await Promise.all([
      roads.confirmFixed(randomUUID(), [], first.issue.id, now),
      roads.confirmFixed(randomUUID(), [], first.issue.id, now),
      roads.confirmFixed(actor, [], first.issue.id, now),
    ]);
    expect(results.filter(result => result.rewardAwarded)).toHaveLength(1);
    expect((await roads.list())[0]).toMatchObject({ status: "community_fixed", confirmationPoints: 6, confirmationCount: 4 });
    const rewards = await database.query<{ count: number; xp: number }>("SELECT COUNT(*)::integer AS count, SUM(bonus_xp)::integer AS xp FROM collector_repair_rewards");
    expect(rewards.rows).toEqual([{ count: 1, xp: 120 }]);
  });
  it("assigns distinct early-report ordinals atomically and never awards a replay", async () => {
    const original = await capture(userA, 60);
    const first = await roads.publish(userA, publication(original.receiptId), now);
    const actors = [userB, randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    const receipts: string[] = [];
    for (let index = 0; index < actors.length; index++) {
      await collectors.saveProfile(actors[index], { displayName: `Reporter ${index + 2}`, avatar: "gremlin", published: false });
      receipts.push((await capture(actors[index], 60)).receiptId);
    }
    const reports = await Promise.all(actors.map((actor, index) => roads.publish(actor, publication(receipts[index], first.issue.id), now)));
    expect(reports.map(result => result.reporterOrdinal).sort()).toEqual([2, 3, 4, 5, 6]);
    expect(reports.map(result => result.reportBonusXp).sort((a, b) => a! - b!)).toEqual([5, 20, 20, 20, 20]);
    expect((await roads.list())[0].reportCount).toBe(6);
    expect(await roads.publish(userA, publication(original.receiptId), now)).toMatchObject({ reportBonusXp: 0, reporterOrdinal: 1, duplicate: true });
    const totals = await database.query<{ bonus: number; count: number }>("SELECT SUM(report_bonus)::integer AS bonus, COUNT(*)::integer AS count FROM road_issue_reports");
    expect(totals.rows).toEqual([{ bonus: 145, count: 6 }]);
  });
});
