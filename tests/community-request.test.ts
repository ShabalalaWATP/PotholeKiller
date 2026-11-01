import { describe, expect, it, vi } from "vitest";
import { collectorRateLimiter, readCommunityJson } from "../lib/community/request";
import { collectorLevel, CommunitySnapshotSchema, ProfileInputSchema, publicLeaderboard, publicProfile } from "../lib/community/schema";

const url = "https://pothole.test/api/community";

describe("bounded community JSON", () => {
  it("reads UTF-8 JSON without requiring Content-Length", async () => {
    const request = new Request(url, { method: "PUT", headers: { "content-type": "application/json; charset=UTF-8" }, body: '{"name":"Éloïse"}' });
    expect(await readCommunityJson(request)).toEqual({ name: "Éloïse" });
  });

  it.each([
    [{ "content-type": "text/plain" }, "{}", 415],
    [{ "content-type": "application/json", "content-length": "5000" }, "{}", 413],
    [{ "content-type": "application/json", "content-length": "invalid" }, "{}", 413],
    [{ "content-type": "application/json" }, "x".repeat(4097), 413],
    [{ "content-type": "application/json" }, "not json", 400],
  ] as const)("rejects unsupported, oversized or unreadable requests", async (headers, body, status) => {
    await expect(readCommunityJson(new Request(url, { method: "PUT", headers, body }))).rejects.toMatchObject({ status });
  });

  it("rejects a missing request body", async () => {
    await expect(readCommunityJson(new Request(url, { method: "PUT", headers: { "content-type": "application/json" } }))).rejects.toMatchObject({ status: 400 });
  });

  it("bounds streamed payloads and excessive tiny chunks", async () => {
    const stream = new ReadableStream({ start(controller) { for (let i = 0; i < 130; i += 1) controller.enqueue(new Uint8Array([32])); controller.close(); } });
    const request = { headers: new Headers({ "content-type": "application/json" }), body: stream } as Request;
    await expect(readCommunityJson(request)).rejects.toMatchObject({ status: 413 });
  });

  it("times out stalled request streams and releases their readers", async () => {
    vi.useFakeTimers();
    try {
      const stream = new ReadableStream({ start() {} });
      const request = { headers: new Headers({ "content-type": "application/json" }), body: stream } as Request;
      const reading = readCommunityJson(request);
      const assertion = expect(reading).rejects.toMatchObject({ status: 408 });
      await vi.advanceTimersByTimeAsync(5000);
      await assertion;
      expect(stream.locked).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("bounded collector rate limits", () => {
  it("resets the same collector's window after a minute", () => {
    const check = collectorRateLimiter();
    for (let index = 0; index < 30; index += 1) check("user-a", 0);
    expect(() => check("user-a", 0)).toThrow();
    expect(() => check("user-a", 60_000)).not.toThrow();
  });

  it("bounds the number of retained collectors while permitting existing buckets", () => {
    const check = collectorRateLimiter();
    for (let index = 0; index < 1000; index += 1) check(`user-${index}`, 0);
    expect(() => check("another-user", 0)).toThrow();
    expect(() => check("user-0", 0)).not.toThrow();
    expect(() => check("another-user", 60_000)).not.toThrow();
  });
});

describe("public game projection", () => {
  it.each([[0, 1, "Crater Cadet"], [120, 2, "Road Ranger"], [240, 3, "Asphalt Avenger"], [360, 4, "Pothole Predator"], [480, 5, "Lord of the Holes"], [1000, 5, "Lord of the Holes"]] as const)("derives the collector rank from %i XP", (xp, level, rank) => {
    expect(collectorLevel(xp)).toEqual({ level, rank });
  });

  it("accepts Unicode display names and never projects identity, email or report details", () => {
    const input = ProfileInputSchema.parse({ displayName: "Éloïse O'Neil", avatar: "puddle", published: false });
    const projected = publicProfile({ ...input, captures: 3, xp: 180, id: "private-id", email: "private@example.com", location: "private" } as never);
    expect(projected).toEqual({ ...input, captures: 3, xp: 180, level: 2, rank: "Road Ranger" });
    expect(publicLeaderboard([{ ...input, captures: 3, xp: 180 }])).toEqual([]);
    expect(CommunitySnapshotSchema.safeParse({ authenticated: true, profile: projected, leaderboard: [] }).success).toBe(true);
  });
});
