import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prepareReport } from "../lib/reporting/report";
import { validReportInput } from "./game-fixtures";

type Client = typeof import("../lib/client/community");
const receiptId = "11111111-1111-4111-8111-111111111111";
const profile = { displayName: "Bump Hunter", avatar: "beast" as const };
const snapshot = {
  authenticated: true,
  profile: { ...profile, published: false, captures: 1, xp: 60, level: 1, rank: "Crater Cadet" },
  leaderboard: [],
};
let client: Client;
let values: Map<string, string>;
let handlers: Set<(event: { key: string | null }) => void>;
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
let setItem: ReturnType<typeof vi.fn<(key: string, value: string) => void>>;

beforeEach(async () => {
  vi.resetModules();
  values = new Map(); handlers = new Set();
  setItem = vi.fn((key: string, value: string) => { values.set(key, value); });
  vi.stubGlobal("window", {
    localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem },
    addEventListener: (_type: string, callback: (event: { key: string | null }) => void) => { handlers.add(callback); },
    removeEventListener: (_type: string, callback: (event: { key: string | null }) => void) => { handlers.delete(callback); },
  });
  fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json(snapshot));
  vi.stubGlobal("fetch", fetchMock);
  client = await import("../lib/client/community");
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("device collector profile privacy and recovery", () => {
  it("stores only the public nickname, avatar and schema version", () => {
    const changed = vi.fn(); const unsubscribe = client.subscribeLocalProfile(changed);
    expect(client.persistLocalProfile(profile)).toBe(true);
    expect(JSON.parse(values.get(client.LOCAL_PROFILE_KEY)!)).toEqual({ version: 1, ...profile });
    expect(client.getLocalProfile()).toEqual(profile);
    expect(client.getLocalProfile()).toBe(client.getLocalProfile());
    expect(changed).toHaveBeenCalledOnce();
    unsubscribe(); expect(handlers.size).toBe(0);
  });
  it("rejects private or unexpected fields rather than persisting them", () => {
    expect(() => client.persistLocalProfile({ ...profile, email: "private@example.com" })).toThrow();
    expect(() => client.persistLocalProfile({ ...profile, token: "private-token" })).toThrow();
    expect(setItem).not.toHaveBeenCalled();
  });
  it.each(["broken JSON", "x".repeat(1001), JSON.stringify({ version: 99, ...profile }),
    JSON.stringify({ version: 1, ...profile, email: "private@example.com" })])("recovers from invalid stored data", stored => {
    expect(client.readLocalProfile({ getItem: () => stored })).toEqual(client.defaultLocalProfile);
  });
  it("keeps a visit-only profile when storage is blocked and reports the failure", () => {
    setItem.mockImplementation(() => { throw new Error("quota"); });
    expect(client.persistLocalProfile(profile)).toBe(false);
    expect(client.getLocalProfile()).toEqual(profile);
    expect(client.readLocalProfile({ getItem: () => { throw new Error("denied"); } })).toEqual(client.defaultLocalProfile);
  });
  it("updates subscribers for relevant cross-tab changes and storage clearing", () => {
    const changed = vi.fn(); const unsubscribe = client.subscribeLocalProfile(changed);
    const initial = client.getLocalProfile();
    values.set(client.LOCAL_PROFILE_KEY, JSON.stringify({ version: 1, ...profile }));
    handlers.forEach(handler => handler({ key: "another-app" }));
    expect(client.getLocalProfile()).toBe(initial); expect(changed).not.toHaveBeenCalled();
    handlers.forEach(handler => handler({ key: client.LOCAL_PROFILE_KEY }));
    expect(client.getLocalProfile()).toEqual(profile); expect(changed).toHaveBeenCalledOnce();
    values.clear(); handlers.forEach(handler => handler({ key: null }));
    expect(client.getLocalProfile()).toEqual(client.defaultLocalProfile);
    unsubscribe();
  });
  it("handles browsers that deny access to the localStorage property", () => {
    vi.stubGlobal("window", { get localStorage() { throw new Error("blocked"); } });
    expect(client.getLocalProfile()).toEqual(client.defaultLocalProfile);
  });
});

describe("community API response and request boundaries", () => {
  it("loads a validated snapshot with same-origin credentials and no cache", async () => {
    await expect(client.loadCommunity()).resolves.toEqual(snapshot);
    expect(fetchMock).toHaveBeenCalledWith("/api/community", expect.objectContaining({ method: "GET", credentials: "same-origin", cache: "no-store" }));
  });
  it("validates a profile before sending and never sends a caller's user ID", async () => {
    await expect(client.saveCommunityProfile({ ...profile, published: false })).resolves.toEqual(snapshot);
    const init = fetchMock.mock.calls[0][1]!;
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ ...profile, published: false });
    fetchMock.mockClear();
    await expect(client.saveCommunityProfile({ ...profile, published: true, userId: receiptId } as never)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([null, [], { authenticated: true, profile: { ...snapshot.profile, xp: -1 }, leaderboard: [] },
    { ...snapshot, profile: { ...snapshot.profile, email: "private@example.com" } }])("rejects unverifiable public data", async body => {
    fetchMock.mockResolvedValue(Response.json(body));
    await expect(client.loadCommunity()).rejects.toThrow("could not be verified");
  });
  it("does not reveal a network or unreadable response body", async () => {
    fetchMock.mockRejectedValueOnce(new Error("postgres://private-credential"));
    await expect(client.loadCommunity()).rejects.toThrow("local collection is safe");
    fetchMock.mockResolvedValueOnce(new Response("not JSON", { status: 200 }));
    await expect(client.loadCommunity()).rejects.toThrow("unreadable response");
  });
  it.each([[401, /Sign in again/], [403, /signed-in collector/], [404, /hosted app/], [409, /profile first/],
    [410, /expired/], [422, /nickname/], [429, /wait/i], [503, /could not be saved/]])("handles HTTP %i without echoing backend details", async (status, message) => {
    fetchMock.mockResolvedValue(new Response("private backend details", { status }));
    await expect(client.loadCommunity()).rejects.toThrow(message);
  });
  it.each([[409, "PROFILE_REQUIRED", /profile first/], [400, "RECEIPT_UNAVAILABLE", /invalid or expired/]])("uses stable recovery codes", async (status, code, message) => {
    fetchMock.mockResolvedValue(Response.json({ code, error: "private backend details" }, { status }));
    await expect(client.loadCommunity()).rejects.toMatchObject({ status, code, message: expect.stringMatching(message) });
  });
  it("ignores inherited error-code names and unknown server messages", async () => {
    fetchMock.mockResolvedValue(Response.json({ code: "toString", error: "postgres://private-credential" }, { status: 503 }));
    await expect(client.loadCommunity()).rejects.toThrow("could not be saved");
  });
});

describe("eligible capture claims", () => {
  const report = () => prepareReport(validReportInput({ scanReceiptId: receiptId }));
  it("never sends demo or unreceipted captures", async () => {
    const demo = prepareReport(validReportInput({ isDemo: true, scanReceiptId: receiptId }));
    const guest = prepareReport(validReportInput());
    expect(client.claimForReport(demo)).toBeNull(); expect(client.claimForReport(guest)).toBeNull();
    expect(client.claimForReport({ ...report(), scanReceiptId: "invalid" })).toBeNull();
    await expect(client.claimCommunityReport(demo)).rejects.toThrow("Only real uploads");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("sends the receipt and observations but no report text, coordinates, count or XP", async () => {
    fetchMock.mockResolvedValue(Response.json({ ...snapshot, awardedXp: 60, duplicate: false }));
    const value = report();
    await expect(client.claimCommunityReport(value)).resolves.toMatchObject({ awardedXp: 60, duplicate: false });
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({
      receiptId, monsterProfile: value.monsterProfile, preparedAtISO: value.preparedAt,
    });
  });
  it("allows a new receipt on an old report and delegates expiry to the server", () => {
    const old = prepareReport(validReportInput({ preparedAt: "2025-01-01T00:00:00.000Z", scanReceiptId: receiptId }));
    expect(client.claimForReport(old)?.receiptId).toBe(receiptId);
  });
  it.each([{ awardedXp: 111, duplicate: false }, { awardedXp: -1, duplicate: false }, { awardedXp: 60 }])("rejects invalid reward responses", async reward => {
    fetchMock.mockResolvedValue(Response.json({ ...snapshot, ...reward }));
    await expect(client.claimCommunityReport(report())).rejects.toThrow("capture response could not be verified");
  });
});
