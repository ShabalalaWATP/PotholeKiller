import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCommunityHandler } from "../lib/community/handler";
import { CommunityFailure } from "../lib/community/errors";
import type { CommunityRepository } from "../lib/community/repository";
import type { ProfileStats } from "../lib/community/schema";

const userId = "a4b638dd-81ca-4ec9-8177-5195ffda702b";
const receiptId = "e98a2d49-58f2-4563-b6c7-5331b34a802b";
const now = new Date("2026-11-01T15:15:00.000Z");
const origin = "https://pothole.test";
const profileInput = { displayName: "Crater Cadet", avatar: "gremlin" as const, published: true };
const stats: ProfileStats = { ...profileInput, captures: 1, xp: 60 };
const claim = { receiptId, monsterProfile: { extent: "large", firstObservedOn: "2026-01-01" }, preparedAtISO: now.toISOString() };

function repository() {
  return {
    getProfile: vi.fn(async () => stats),
    leaderboard: vi.fn(async () => [stats]),
    saveProfile: vi.fn(async () => undefined),
    claimCapture: vi.fn(async (_id, input) => ({ awardedXp: input.awardedXp, duplicate: false })),
    issueReceipt: vi.fn(async () => ({ receiptId, expiresAt: "2026-11-01T15:45:00.000Z" })),
  } satisfies CommunityRepository;
}

function request(method: string, body?: unknown, headers?: HeadersInit) {
  return new Request(`${origin}/api/community`, {
    method,
    headers: { origin, "content-type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("APP_ORIGIN", origin);
});

describe("public shared collection snapshots", () => {
  it("returns genuine published leaderboard fields without auth IDs, email or private profiles", async () => {
    const repo = repository();
    repo.leaderboard.mockResolvedValue([
      { ...stats, id: userId, email: "private@example.com" } as ProfileStats,
      { ...stats, displayName: "Private Player", published: false },
    ]);
    const getUser = vi.fn(async () => null);
    const response = await createCommunityHandler({ getUser, repository: () => repo })(request("GET"));
    const data = await response.json();
    expect(data).toEqual({
      authenticated: false,
      profile: null,
      leaderboard: [{ displayName: "Crater Cadet", avatar: "gremlin", captures: 1, xp: 60, level: 1, rank: "Crater Cadet", position: 1 }],
    });
    expect(JSON.stringify(data)).not.toMatch(/private@example|Private Player|a4b638dd/);
    expect(repo.getProfile).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("returns only the authenticated user's own profile", async () => {
    const repo = repository();
    const response = await createCommunityHandler({ getUser: async () => ({ id: userId }), repository: () => repo })(request("GET"));
    expect(repo.getProfile).toHaveBeenCalledExactlyOnceWith(userId);
    expect((await response.json()).profile).toMatchObject({ ...stats, level: 1, rank: "Crater Cadet" });
  });

  it("does not invent a profile before the collector has saved one", async () => {
    const repo = { ...repository(), getProfile: vi.fn(async () => null) };
    const response = await createCommunityHandler({ getUser: async () => ({ id: userId }), repository: () => repo })(request("GET"));
    expect(await response.json()).toMatchObject({ authenticated: true, profile: null });
  });

  it("treats unavailable local Identity or a malformed SDK identity as an unauthenticated session", async () => {
    for (const getUser of [async () => { throw new Error("Not running in a modern Netlify function"); }, async () => ({ id: "not-a-uuid" })]) {
      const response = await createCommunityHandler({ getUser, repository })(request("GET"));
      expect(await response.json()).toMatchObject({ authenticated: false, profile: null });
    }
  });

  it("reports unavailable persistence explicitly, with no fake empty leaderboard or leaked errors", async () => {
    const repo = repository();
    repo.leaderboard.mockRejectedValue(new Error("postgres://secret:password@internal"));
    const response = await createCommunityHandler({ getUser: async () => null, repository: () => repo })(request("GET"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "The shared collection is temporarily unavailable. Your local progress is safe.", code: "COMMUNITY_UNAVAILABLE" });
  });

  it("returns at most twenty real, published collectors", async () => {
    const repo = repository();
    repo.leaderboard.mockResolvedValue(Array.from({ length: 25 }, (_, index) => ({ ...stats, displayName: `Player ${index}` })));
    const response = await createCommunityHandler({ getUser: async () => null, repository: () => repo })(request("GET"));
    const data = await response.json();
    expect(data.leaderboard).toHaveLength(20);
    expect(data.leaderboard[19].position).toBe(20);
  });
});

describe("profile ownership and request validation", () => {
  it("saves only public game fields for the SDK-resolved user", async () => {
    const repo = repository();
    const response = await createCommunityHandler({ getUser: async () => ({ id: userId }), repository: () => repo })(request("PUT", profileInput));
    expect(response.status).toBe(200);
    expect(repo.saveProfile).toHaveBeenCalledExactlyOnceWith(userId, profileInput);
  });

  it.each(["PUT", "POST"])("requires authentication for %s", async method => {
    const repo = repository();
    const response = await createCommunityHandler({ getUser: async () => null, repository: () => repo })(request(method, profileInput));
    expect(response.status).toBe(401);
    expect(repo.saveProfile).not.toHaveBeenCalled();
    expect(repo.claimCapture).not.toHaveBeenCalled();
  });

  it.each([
    { origin: "https://attacker.example" },
    { "sec-fetch-site": "cross-site" },
  ] as Record<string, string>[])("rejects cross-origin mutations: %j", async headers => {
    const repo = repository();
    const response = await createCommunityHandler({ getUser: async () => ({ id: userId }), repository: () => repo })(request("PUT", profileInput, headers));
    expect(response.status).toBe(403);
    expect(repo.saveProfile).not.toHaveBeenCalled();
  });

  it.each([
    { ...profileInput, displayName: "a" },
    { ...profileInput, displayName: "a".repeat(25) },
    { ...profileInput, displayName: "person@example.com" },
    { ...profileInput, displayName: "Name\nSpoofed" },
    { ...profileInput, avatar: "unknown" },
    { ...profileInput, published: "true" },
    { ...profileInput, userId: "b6b3a058-4b28-4259-a6af-b47a2f198eaa" },
    { ...profileInput, captures: 99999, xp: 99999 },
  ])("rejects invalid profile fields or client-supplied counters/identity: %j", async input => {
    const repo = repository();
    const response = await createCommunityHandler({ getUser: async () => ({ id: userId }), repository: () => repo })(request("PUT", input));
    expect(response.status).toBe(400);
    expect(repo.saveProfile).not.toHaveBeenCalled();
  });

  it("rejects unsupported methods before consulting authentication", async () => {
    const getUser = vi.fn(async () => ({ id: userId }));
    const response = await createCommunityHandler({ getUser, repository })(request("DELETE"));
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, PUT, POST");
    expect(getUser).not.toHaveBeenCalled();
  });

  it("limits authenticated updates to thirty per minute without storing IP addresses", async () => {
    const repo = repository();
    const handler = createCommunityHandler({ getUser: async () => ({ id: userId }), repository: () => repo, now: () => now });
    for (let index = 0; index < 30; index += 1) expect((await handler(request("PUT", profileInput))).status).toBe(200);
    expect((await handler(request("PUT", profileInput))).status).toBe(429);
    expect(repo.saveProfile).toHaveBeenCalledTimes(30);
  });
});

describe("authenticated receipt claims", () => {
  it("computes bounded bonus XP on the server and uses only the authenticated owner", async () => {
    const repo = repository();
    const response = await createCommunityHandler({ getUser: async () => ({ id: userId }), repository: () => repo, now: () => now })(request("POST", claim));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ authenticated: true, awardedXp: 110, duplicate: false });
    expect(repo.claimCapture).toHaveBeenCalledExactlyOnceWith(userId, { receiptId, preparedAtISO: now.toISOString(), awardedXp: 110 }, now);
  });

  it("returns zero extra XP for an already collected photograph", async () => {
    const repo = repository();
    repo.claimCapture.mockResolvedValue({ awardedXp: 0, duplicate: true });
    const response = await createCommunityHandler({ getUser: async () => ({ id: userId }), repository: () => repo, now: () => now })(request("POST", claim));
    expect(await response.json()).toMatchObject({ awardedXp: 0, duplicate: true });
  });

  it("preserves ownership and expiry failures without leaking receipt owner information", async () => {
    const repo = repository();
    repo.claimCapture.mockRejectedValue(new CommunityFailure(400, "RECEIPT_UNAVAILABLE", "This live scan receipt is invalid or expired. Scan the photograph again."));
    const response = await createCommunityHandler({ getUser: async () => ({ id: userId }), repository: () => repo, now: () => now })(request("POST", claim));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "RECEIPT_UNAVAILABLE" });
  });

  it.each([
    { ...claim, receiptId: "sample-pothole" },
    { ...claim, userId },
    { ...claim, captures: 10 },
    { ...claim, awardedXp: 99999 },
    { ...claim, preparedAtISO: "2026-11-02T00:00:00.000Z" },
    { ...claim, monsterProfile: { extent: "large", firstObservedOn: "2026-11-02" } },
    { ...claim, monsterProfile: { extent: "large", firstObservedOn: "2026-02-30" } },
  ])("rejects invalid, future or forged claim fields: %j", async input => {
    const repo = repository();
    const response = await createCommunityHandler({ getUser: async () => ({ id: userId }), repository: () => repo, now: () => now })(request("POST", input));
    expect(response.status).toBe(400);
    expect(repo.claimCapture).not.toHaveBeenCalled();
  });
});
