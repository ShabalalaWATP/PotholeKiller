import { beforeEach, describe, expect, it, vi } from "vitest";
import community, { config } from "../netlify/functions/community.mjs";

const boundary = vi.hoisted(() => ({
  getUser: vi.fn(),
  getProfile: vi.fn(),
  leaderboard: vi.fn(),
  saveProfile: vi.fn(),
}));
vi.mock("@netlify/identity", () => ({ getUser: boundary.getUser }));
vi.mock("../lib/community/database", () => ({
  databaseCommunityRepository: {
    getProfile: boundary.getProfile,
    leaderboard: boundary.leaderboard,
    saveProfile: boundary.saveProfile,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APP_ORIGIN", "https://pothole.test");
  boundary.getUser.mockResolvedValue(null);
  boundary.leaderboard.mockResolvedValue([]);
  boundary.getProfile.mockResolvedValue(null);
});

describe("native Netlify community entry point", () => {
  it("routes the modern function to /api/community with a platform request limit", () => {
    expect(config).toMatchObject({ path: "/api/community", rateLimit: { action: "rate_limit", aggregateBy: ["ip"], windowSize: 60, windowLimit: 120 } });
  });

  it("uses the official Identity SDK without exposing private account fields", async () => {
    const response = await community(new Request("https://pothole.test/api/community"));
    expect(boundary.getUser).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({ authenticated: false, profile: null, leaderboard: [] });
  });

  it("does not authenticate an arbitrary caller-provided bearer header", async () => {
    const response = await community(new Request("https://pothole.test/api/community", {
      method: "PUT", headers: { origin: "https://pothole.test", authorization: "Bearer forged-client-token", "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Collector", avatar: "gremlin", published: true }),
    }));
    expect(response.status).toBe(401);
    expect(boundary.saveProfile).not.toHaveBeenCalled();
  });
});
