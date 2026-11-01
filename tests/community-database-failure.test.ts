import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { databaseCommunityRepository as repository } from "../lib/community/database";

const boundary = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock("@netlify/database", () => ({ getDatabase: () => ({ pool: { connect: boundary.connect } }) }));

const userId = "a4b638dd-81ca-4ec9-8177-5195ffda702b";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

describe("bounded database failures and connection cleanup", () => {
  it("times out a stalled connection and releases it if the driver connects late", async () => {
    vi.useFakeTimers();
    const client = { query: vi.fn(), release: vi.fn() };
    let connected: (value: typeof client) => void = () => undefined;
    boundary.connect.mockReturnValue(new Promise(resolve => { connected = resolve; }));
    const reading = repository.getProfile(userId);
    const assertion = expect(reading).rejects.toThrow("connection timed out");
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
    connected(client);
    await vi.advanceTimersByTimeAsync(0);
    expect(client.release).toHaveBeenCalledOnce();
    expect(client.query).not.toHaveBeenCalled();
  });

  it("preserves connection errors without leaving an unhandled late rejection", async () => {
    boundary.connect.mockRejectedValue(new Error("Database unavailable"));
    await expect(repository.getProfile(userId)).rejects.toThrow("Database unavailable");
  });

  it("releases connections and preserves the original failure even if rollback also fails", async () => {
    const client = {
      query: vi.fn(async (text: string) => {
        if (text.startsWith("SELECT")) throw new Error("Read failed");
        if (text === "ROLLBACK") throw new Error("Rollback failed");
        return { rows: [] };
      }),
      release: vi.fn(),
    };
    boundary.connect.mockResolvedValue(client);
    await expect(repository.getProfile(userId)).rejects.toThrow("Read failed");
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
  });
});
