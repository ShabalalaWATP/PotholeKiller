import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Limits = typeof import("../lib/security/limits");
let limits: Limits;
const request = (ip = "127.0.0.1") => new Request("https://pothole.example/api/analyse", { headers: { "x-forwarded-for": ip } });

beforeEach(async () => {
  vi.resetModules();
  limits = await import("../lib/security/limits");
});
afterEach(() => vi.unstubAllEnvs());

describe("best-effort per-process request protection", () => {
  it("limits attempts and releases expired minute buckets", () => {
    for (let i = 0; i < 6; i++) limits.checkRateLimit(request(), 1000);
    expect(() => limits.checkRateLimit(request(), 1001)).toThrow(/Wait a minute/);
    expect(() => limits.checkRateLimit(request(), 61000)).not.toThrow();
  });
  it("ignores spoofable forwarded identity unless proxy trust is explicit", () => {
    vi.stubEnv("ANALYSIS_RATE_LIMIT", "1");
    limits.checkRateLimit(request("1.1.1.1"));
    expect(() => limits.checkRateLimit(request("8.8.8.8"))).toThrow();
  });
  it("can use valid trusted proxy addresses, with invalid addresses sharing a bucket", () => {
    vi.stubEnv("TRUST_PROXY", "true");
    vi.stubEnv("ANALYSIS_RATE_LIMIT", "1");
    limits.checkRateLimit(request("1.1.1.1"));
    expect(() => limits.checkRateLimit(request("8.8.8.8"))).not.toThrow();
    limits.checkRateLimit(request("invalid"));
    expect(() => limits.checkRateLimit(request("also-invalid"))).toThrow();
  });
  it("bounds the number of client buckets", () => {
    vi.stubEnv("TRUST_PROXY", "true");
    for (let i = 0; i < 1000; i++) limits.checkRateLimit(request(`10.0.${Math.floor(i / 250)}.${i % 250 + 1}`), 1000);
    expect(() => limits.checkRateLimit(request("8.8.8.8"), 1000)).toThrow();
  });
  it("reserves only bounded concurrency and releases each slot once", () => {
    const first = limits.reserveAnalysis();
    const second = limits.reserveAnalysis();
    expect(() => limits.reserveAnalysis()).toThrow(/Other photographs/);
    first(); first();
    const replacement = limits.reserveAnalysis();
    expect(() => limits.reserveAnalysis()).toThrow();
    replacement(); second();
    expect(() => limits.reserveAnalysis()).not.toThrow();
  });
  it("reserves scanner capacity without charging the provider budget", () => {
    vi.stubEnv("ANALYSIS_DAILY_LIMIT", "1");
    for (let i = 0; i < 10; i++) limits.reserveAnalysis()();
    expect(() => limits.chargeAnalysisAttempt()).not.toThrow();
    expect(() => limits.chargeAnalysisAttempt()).toThrow(/live scan limit/);
  });
  it("caps actual provider attempts including failures and resets on the next UTC day", () => {
    vi.stubEnv("ANALYSIS_DAILY_LIMIT", "2");
    limits.chargeAnalysisAttempt(new Date("2026-11-01T10:00:00Z"));
    limits.chargeAnalysisAttempt(new Date("2026-11-01T10:01:00Z"));
    expect(() => limits.chargeAnalysisAttempt(new Date("2026-11-01T11:00:00Z"))).toThrow(/live scan limit/);
    expect(() => limits.chargeAnalysisAttempt(new Date("2026-11-02T00:00:00Z"))).not.toThrow();
  });
  it("synchronously commits the last daily attempt across concurrent scanner slots", () => {
    vi.stubEnv("ANALYSIS_DAILY_LIMIT", "1");
    const first = limits.reserveAnalysis();
    const second = limits.reserveAnalysis();
    limits.chargeAnalysisAttempt();
    expect(() => limits.chargeAnalysisAttempt()).toThrow(/live scan limit/);
    first(); second();
  });
  it("uses safe defaults for invalid settings and caps excessive configured limits", () => {
    vi.stubEnv("ANALYSIS_CONCURRENCY_LIMIT", "-1");
    const a = limits.reserveAnalysis();
    const b = limits.reserveAnalysis();
    expect(() => limits.reserveAnalysis()).toThrow();
    a(); b();
    vi.stubEnv("ANALYSIS_CONCURRENCY_LIMIT", "10000");
    const release = Array.from({ length: 8 }, () => limits.reserveAnalysis());
    expect(() => limits.reserveAnalysis()).toThrow();
    release.forEach(fn => fn());
  });
});
