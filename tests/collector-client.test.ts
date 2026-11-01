import { afterEach, describe, expect, it, vi } from "vitest";
import { CollectorSession } from "../lib/client/collector-session";
import { discoverIdentity, invalidCallbackUrl, initialiseIdentity } from "../lib/client/collector-identity";
import { CommunityError, communitySyncCandidates, defaultLocalProfile, loadCommunity, readLocalProfile, saveCommunityProfile, shouldRetryCommunityClaim } from "../lib/client/community";
import type { Settings } from "@netlify/identity";
import { prepareReport } from "../lib/reporting/report";
import { captureXpForReport } from "../lib/game/progression";
import { validReportInput } from "./game-fixtures";

const sdk = vi.hoisted(() => ({ handleAuthCallback: vi.fn(), getSettings: vi.fn() }));
vi.mock("@netlify/identity", () => sdk);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const settings: Settings = { autoconfirm: false, disableSignup: false, providers: { email: true, google: false, github: true, gitlab: false, bitbucket: false, facebook: false } };
const page = { href: "https://example.netlify.app/#confirmation_token=invalid&view=profile", protocol: "https:", hostname: "example.netlify.app" };
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("collector session isolation", () => {
  it("notifies loading subscribers and exposes only memory session state", () => {
    const session = new CollectorSession();
    const counts: number[] = [];
    const unsubscribe = session.subscribe(() => counts.push(session.getPendingCount()));
    expect(session.currentUserId).toBeNull();
    expect(session.sessionVersion).toBe(0);
    expect(session.hasRequestedSnapshot).toBe(false);
    session.observeIdentity("A");
    expect(session.currentUserId).toBe("A");
    expect(session.sessionVersion).toBe(1);
    const first = session.begin("read");
    const second = session.begin("write");
    expect(session.hasRequestedSnapshot).toBe(true);
    session.finish(first);
    session.finish(second);
    expect(counts).toEqual([0, 1, 2, 1, 0]);
    unsubscribe();
    session.observeIdentity(null);
    expect(counts).toHaveLength(5);
    expect(session.currentUserId).toBeNull();
    expect(session.hasRequestedSnapshot).toBe(false);
  });

  it("discards A's deferred private profile after B signs in", async () => {
    const session = new CollectorSession();
    session.observeIdentity("A");
    const a = deferred<{ name: string; published: boolean }>();
    let view: { name: string; published: boolean } | null = null;
    const failed = vi.fn();
    const old = session.run("read", () => a.promise, value => { view = value; }, failed);
    await Promise.resolve();
    session.observeIdentity("B");
    const current = session.run("read", async () => ({ name: "B", published: false }), value => { view = value; }, failed);
    await current;
    a.resolve({ name: "A private profile", published: true });
    expect(await old).toBe(false);
    expect(view).toEqual({ name: "B", published: false });
    expect(failed).not.toHaveBeenCalled();
    expect(session.getPendingCount()).toBe(0);
  });

  it("does not let an older GET replace a newly saved profile", async () => {
    const session = new CollectorSession();
    session.observeIdentity("A");
    const get = deferred<string>();
    const put = deferred<string>();
    const requestOrder: string[] = [];
    let view = "initial";
    const oldGet = session.run("read", () => { requestOrder.push("GET"); return get.promise; }, value => { view = value; }, vi.fn());
    await Promise.resolve();
    const save = session.run("write", () => { requestOrder.push("PUT"); return put.promise; }, value => { view = value; }, vi.fn());
    put.resolve("new nickname and private setting");
    expect(session.getPendingCount()).toBe(2);
    get.resolve("old nickname and published setting");
    expect(await oldGet).toBe(false);
    await save;
    expect(requestOrder).toEqual(["GET", "PUT"]);
    expect(view).toBe("new nickname and private setting");
    expect(session.getPendingCount()).toBe(0);
  });

  it("runs a refresh requested during a write after that write", async () => {
    const session = new CollectorSession();
    session.observeIdentity("A");
    const write = deferred<string>();
    const events: string[] = [];
    let view = "before";
    const save = session.run("write", () => { events.push("PUT"); return write.promise; }, value => { view = value; }, vi.fn());
    await Promise.resolve();
    const refresh = session.run("read", async () => { events.push("GET after PUT"); return "fresh server value"; }, value => { view = value; }, vi.fn());
    expect(events).toEqual(["PUT"]);
    write.resolve("saved value");
    await Promise.all([save, refresh]);
    expect(events).toEqual(["PUT", "GET after PUT"]);
    expect(view).toBe("fresh server value");
  });

  it("discards logout-era errors and finalisers without clearing a new request's loading state", async () => {
    const session = new CollectorSession();
    session.observeIdentity("A");
    const old = deferred<string>();
    const guest = deferred<string>();
    const failed = vi.fn();
    const accept = vi.fn();
    const a = session.run("write", () => old.promise, accept, failed);
    await Promise.resolve();
    session.observeIdentity(null, true);
    const next = session.run("read", () => guest.promise, accept, failed);
    await Promise.resolve();
    old.reject(new Error("A's private failure"));
    await a;
    expect(failed).not.toHaveBeenCalled();
    expect(accept).not.toHaveBeenCalled();
    expect(session.getPendingCount()).toBe(1);
    guest.resolve("public guest board");
    await next;
    expect(accept).toHaveBeenCalledOnce();
    expect(session.getPendingCount()).toBe(0);
  });

  it("never starts an old queued write after the account changes", async () => {
    const session = new CollectorSession();
    session.observeIdentity("A");
    const first = deferred<string>();
    const blocked = session.run("read", () => first.promise, vi.fn(), vi.fn());
    await Promise.resolve();
    const oldWrite = vi.fn().mockResolvedValue("A update");
    const queued = session.run("write", oldWrite, vi.fn(), vi.fn());
    session.observeIdentity("B");
    first.resolve("A response");
    await Promise.all([blocked, queued]);
    expect(oldWrite).not.toHaveBeenCalled();
    expect(session.getPendingCount()).toBe(0);
  });

  it("surfaces a current request failure while releasing its loading count", async () => {
    const session = new CollectorSession();
    const failure = new Error("Temporary service failure");
    const reject = vi.fn();
    expect(await session.run("read", async () => { throw failure; }, vi.fn(), reject)).toBe(false);
    expect(reject).toHaveBeenCalledWith(failure, expect.objectContaining({ kind: "read" }));
    expect(session.getPendingCount()).toBe(0);
  });

  it("rejects an initial getUser result after an SDK auth event", () => {
    const session = new CollectorSession();
    const initialRead = session.identityStamp();
    session.observeIdentity("B");
    expect(session.acceptsIdentity(initialRead)).toBe(false);
    const sameUserRead = session.identityStamp();
    session.observeIdentity("B");
    expect(session.acceptsIdentity(sameUserRead)).toBe(false);
  });

  it("does not let an older auth intent replace a newer intent's feedback", () => {
    const session = new CollectorSession();
    const earlier = session.begin("auth");
    const latest = session.begin("auth");
    expect(session.canCommit(earlier)).toBe(false);
    expect(session.canCommit(latest)).toBe(true);
    session.finish(earlier);
    expect(session.getPendingCount()).toBe(1);
    session.finish(latest);
    expect(session.getPendingCount()).toBe(0);
  });

  it("requires a current authenticated snapshot before enabling publication", () => {
    const session = new CollectorSession();
    session.observeIdentity("A");
    const a = session.begin("read");
    expect(session.snapshotLoaded).toBe(false);
    session.verifySnapshot(a, true);
    expect(session.snapshotLoaded).toBe(true);
    session.observeIdentity("B");
    expect(session.snapshotLoaded).toBe(false);
    session.verifySnapshot(a, true);
    expect(session.snapshotLoaded).toBe(false);
    const b = session.begin("read");
    session.verifySnapshot(b, false);
    expect(session.snapshotLoaded).toBe(false);
    session.verifySnapshot(b, true);
    expect(session.snapshotLoaded).toBe(true);
    session.observeIdentity(null);
    expect(session.snapshotLoaded).toBe(false);
  });
});

describe("Identity callback recovery", () => {
  it("initialises the official SDK once and uses history only for a failed auth fragment", async () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", { location: { ...page }, history: { state: { screen: "profile" }, replaceState } });
    sdk.handleAuthCallback.mockRejectedValue({ status: 401 });
    sdk.getSettings.mockResolvedValue(settings);
    const first = initialiseIdentity();
    expect(initialiseIdentity()).toBe(first);
    const state = await first;
    expect(state.identity).toBeDefined();
    expect(state.available).toBe(true);
    expect(state.callbackError).toMatch(/invalid or has expired/);
    expect(sdk.handleAuthCallback).toHaveBeenCalledOnce();
    expect(sdk.getSettings).toHaveBeenCalledOnce();
    expect(replaceState).toHaveBeenCalledWith({ screen: "profile" }, "", "https://example.netlify.app/#view=profile");
  });
  it("keeps normal sign-in available after an expired callback and removes only auth fragment keys", async () => {
    const replace = vi.fn();
    const identity = { handleAuthCallback: vi.fn().mockRejectedValue({ status: 400 }), getSettings: vi.fn().mockResolvedValue(settings) };
    const result = await discoverIdentity(identity, page, replace);
    expect(result.available).toBe(true);
    expect(result.settings).toBe(settings);
    expect(result.callbackError).toMatch(/invalid or has expired/);
    expect(identity.getSettings).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith("https://example.netlify.app/#view=profile");
  });

  it("preserves a callback on a network failure and offers configuration guidance", async () => {
    const replace = vi.fn();
    const result = await discoverIdentity({ handleAuthCallback: vi.fn().mockRejectedValue({ status: 503 }), getSettings: vi.fn().mockResolvedValue(settings) }, page, replace);
    expect(result.available).toBe(true);
    expect(result.callbackError).toMatch(/configuration/);
    expect(replace).not.toHaveBeenCalled();
  });

  it("does not alter unrelated fragments or call settings in local development", async () => {
    expect(invalidCallbackUrl("https://example.com/#view=map")).toBeNull();
    const identity = { handleAuthCallback: vi.fn().mockResolvedValue(null), getSettings: vi.fn() };
    const result = await discoverIdentity(identity, { href: "http://localhost:3000/", protocol: "http:", hostname: "localhost" }, vi.fn());
    expect(identity.handleAuthCallback).toHaveBeenCalledOnce();
    expect(identity.getSettings).not.toHaveBeenCalled();
    expect(result.available).toBe(false);
  });

  it("bounds settings discovery without clearing an existing SDK session", async () => {
    vi.useFakeTimers();
    const identity = { handleAuthCallback: vi.fn().mockResolvedValue(null), getSettings: vi.fn().mockReturnValue(new Promise(() => {})) };
    const expected = expect(discoverIdentity(identity, page, vi.fn())).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(8000);
    await expected;
  });
});

describe("community client boundaries", () => {
  it("retries a fresh receipt attached to an older report without changing its date or XP", () => {
    const report = prepareReport(validReportInput({ preparedAt: "2026-10-01T13:00:00.000Z", scanReceiptId: "11111111-1111-4111-8111-111111111111" }));
    const originalXp = captureXpForReport(report);
    const candidates = communitySyncCandidates([report], new Set([report.id]));
    expect(candidates).toEqual([report]);
    expect(candidates[0].preparedAt).toBe("2026-10-01T13:00:00.000Z");
    expect(captureXpForReport(candidates[0])).toBe(originalXp);
  });

  it("prioritises pending captures and excludes demos or records without receipts", () => {
    const first = prepareReport(validReportInput({ imageHash: "a".repeat(64), scanReceiptId: "11111111-1111-4111-8111-111111111111" }));
    const pending = prepareReport(validReportInput({ imageHash: "b".repeat(64), scanReceiptId: "22222222-2222-4222-8222-222222222222" }));
    const demo = prepareReport(validReportInput({ imageHash: "c".repeat(64), isDemo: true, scanReceiptId: "33333333-3333-4333-8333-333333333333" }));
    const local = prepareReport(validReportInput({ imageHash: "d".repeat(64) }));
    expect(communitySyncCandidates([first, demo, local, pending], new Set([pending.id]))).toEqual([pending, first]);
  });

  it("keeps profile-required claims pending but stops retrying invalid or expired receipts", () => {
    expect(shouldRetryCommunityClaim(new CommunityError("Ignored text", 409, "PROFILE_REQUIRED"))).toBe(true);
    expect(shouldRetryCommunityClaim(new CommunityError("Ignored text", 400, "RECEIPT_UNAVAILABLE"))).toBe(false);
    expect(shouldRetryCommunityClaim(new CommunityError("Ignored text", 410))).toBe(false);
    expect(shouldRetryCommunityClaim(new CommunityError("Ignored text", 403))).toBe(false);
    expect(shouldRetryCommunityClaim(new CommunityError("Ignored text", 429))).toBe(true);
    expect(shouldRetryCommunityClaim(new CommunityError("Ignored text"))).toBe(true);
    expect(shouldRetryCommunityClaim(new Error("Offline"))).toBe(true);
  });
  it("rejects stored credentials or publication flags from the local profile", () => {
    expect(readLocalProfile({ getItem: () => JSON.stringify({ version: 1, displayName: "Collector", avatar: "beast", published: true, email: "private@example.com" }) })).toBe(defaultLocalProfile);
    expect(readLocalProfile({ getItem: () => JSON.stringify({ version: 1, displayName: "Collector", avatar: "beast" }) })).toEqual({ displayName: "Collector", avatar: "beast" });
  });

  it("uses the stable profile-required code without echoing raw errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code: "PROFILE_REQUIRED", error: "private provider detail" }, { status: 409 })));
    await expect(saveCommunityProfile({ displayName: "Collector", avatar: "beast", published: false })).rejects.toThrow("Save your collector profile first");
  });

  it("does not accept private identity fields in a public response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ authenticated: true, profile: { displayName: "Collector", avatar: "beast", published: false, captures: 0, xp: 0, level: 1, rank: "Crater Cadet", email: "private@example.com" }, leaderboard: [] })));
    await expect(loadCommunity()).rejects.toThrow("could not be verified");
  });
});
