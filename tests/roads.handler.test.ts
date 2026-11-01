import { describe, expect, it, vi } from "vitest";
import { createRoadIssueHandler } from "../lib/roads/handler";
import type { RoadRepository } from "../lib/roads/repository";
import { RoadIssueSchema } from "../lib/roads/schema";

const id = "11111111-1111-4111-8111-111111111111";
const request = (body: unknown, origin = "https://pothole.example") => new Request("https://pothole.example/api/road-issues", {
  method: "POST", headers: { origin, "content-type": "application/json", "x-user-id": "forged" }, body: JSON.stringify(body),
});
const repository = () => ({ list: vi.fn().mockResolvedValue([]), publish: vi.fn(), confirmFixed: vi.fn().mockResolvedValue({ duplicate: false, rewardAwarded: false }) });

describe("vital road mutation boundaries", () => {
  it("requires same-origin SDK identity and rejects supplied vote weights or actor IDs", async () => {
    const database = repository();
    const handler = createRoadIssueHandler({ getUser: async () => ({ id, roles: ["council_verified"] }), repository: () => database as unknown as RoadRepository });
    expect((await handler(request({ action: "confirm_fixed", issueId: id }, "https://attacker.example"))).status).toBe(403);
    expect((await handler(request({ action: "confirm_fixed", issueId: id, weight: 99, userId: id }))).status).toBe(400);
    expect(database.confirmFixed).not.toHaveBeenCalled();
    expect((await handler(request({ action: "confirm_fixed", issueId: id }))).status).toBe(200);
    expect(database.confirmFixed).toHaveBeenCalledWith(id, ["council_verified"], id, expect.any(Date));
  });
  it("never touches mutation storage for guests", async () => {
    const database = repository();
    const handler = createRoadIssueHandler({ getUser: async () => null, repository: () => database as unknown as RoadRepository });
    expect((await handler(request({ action: "confirm_fixed", issueId: id }))).status).toBe(401);
    expect(database.confirmFixed).not.toHaveBeenCalled();
  });
  it("rejects future observation dates at publication and public-response boundaries", async () => {
    const now = new Date("2026-11-01T15:40:00.000Z");
    const database = repository();
    const handler = createRoadIssueHandler({ getUser: async () => ({ id }), repository: () => database as unknown as RoadRepository, now: () => now });
    const profile = { extent: "medium", firstObservedOn: "2026-11-02" };
    const payload = { action: "publish", receiptId: id, label: "Mare Street", location: { lat: 51.5452, lng: -0.0559 }, type: "medium", monsterProfile: profile };
    expect((await handler(request(payload))).status).toBe(400);
    expect(database.publish).not.toHaveBeenCalled();
    expect(RoadIssueSchema.safeParse({
      id, label: payload.label, location: payload.location, type: payload.type, monsterProfile: profile,
      createdAtISO: now.toISOString(), status: "open", confirmationPoints: 0, confirmationCount: 0, reportCount: 1,
    }).success).toBe(false);
  });
});
