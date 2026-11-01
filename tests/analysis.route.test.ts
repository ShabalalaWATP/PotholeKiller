import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/config/route";

const boundary = vi.hoisted(() => ({ analyse: vi.fn(), sanitise: vi.fn(), receipt: vi.fn() }));
vi.mock("../lib/ai/analyse", () => ({ analysePhotograph: boundary.analyse }));
vi.mock("../lib/security/image", () => ({ sanitiseImage: boundary.sanitise }));
vi.mock("../lib/community/scan-receipt", () => ({ maybeIssueScanReceipt: boundary.receipt }));

function request(origin = "https://pothole.example", form?: FormData) {
  const data = form ?? new FormData();
  if (!form) data.set("image", new File(["photograph"], "photo.jpg", { type: "image/jpeg" }));
  return new Request("https://pothole.example/api/analyse", { method: "POST", headers: { origin }, body: data });
}

let POST: typeof import("../app/api/analyse/route").POST;
let RequestFailure: typeof import("../lib/security/errors").RequestFailure;
beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("OPENAI_API_KEY", "unit-test-placeholder");
  vi.stubEnv("ANALYSIS_RATE_LIMIT", "6");
  vi.stubEnv("ANALYSIS_DAILY_LIMIT", "100");
  vi.stubEnv("ANALYSIS_CONCURRENCY_LIMIT", "2");
  ({ POST } = await import("../app/api/analyse/route"));
  ({ RequestFailure } = await import("../lib/security/errors"));
  boundary.sanitise.mockResolvedValue("data:image/jpeg;base64,cleaned");
  boundary.analyse.mockResolvedValue({ defectType: "pothole" });
  boundary.receipt.mockResolvedValue({});
});
afterEach(() => vi.unstubAllEnvs());

describe("analysis HTTP route", () => {
  it("responds with live provenance and disables caching", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ analysis: { defectType: "pothole" }, source: "live" });
    expect(boundary.analyse).toHaveBeenCalledWith("data:image/jpeg;base64,cleaned");
  });
  it("rejects cross-origin requests before processing an image", async () => {
    const response = await POST(request("https://untrusted.example"));
    expect(response.status).toBe(403);
    expect(boundary.sanitise).not.toHaveBeenCalled();
    expect(boundary.analyse).not.toHaveBeenCalled();
    expect(boundary.receipt).not.toHaveBeenCalled();
  });
  it("reports missing configuration without contacting the provider", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("NOT_CONFIGURED");
    expect(boundary.analyse).not.toHaveBeenCalled();
  });
  it("rejects missing image without calling the provider", async () => {
    const response = await POST(request("https://pothole.example", new FormData()));
    expect(response.status).toBe(400);
    expect(boundary.analyse).not.toHaveBeenCalled();
  });
  it("returns sanitisation errors and releases the concurrency slot", async () => {
    boundary.sanitise.mockRejectedValueOnce(new RequestFailure(415, "INVALID_IMAGE", "Choose another image."));
    const response = await POST(request());
    expect(response.status).toBe(415);
    expect(boundary.analyse).not.toHaveBeenCalled();
    expect((await POST(request())).status).toBe(200);
  });
  it("does not charge missing or invalid images against the daily provider budget", async () => {
    vi.stubEnv("ANALYSIS_DAILY_LIMIT", "1");
    expect((await POST(request("https://pothole.example", new FormData()))).status).toBe(400);
    boundary.sanitise.mockRejectedValueOnce(new RequestFailure(415, "INVALID_IMAGE", "Choose another image."));
    expect((await POST(request())).status).toBe(415);
    expect((await POST(request())).status).toBe(200);
    const exhausted = await POST(request());
    expect(exhausted.status).toBe(429);
    expect((await exhausted.json()).code).toBe("DAILY_LIMIT");
    expect(boundary.analyse).toHaveBeenCalledTimes(1);
  });
  it("still rate-limits malformed uploads", async () => {
    vi.stubEnv("ANALYSIS_RATE_LIMIT", "1");
    expect((await POST(request("https://pothole.example", new FormData()))).status).toBe(400);
    const limited = await POST(request());
    expect(limited.status).toBe(429);
    expect((await limited.json()).code).toBe("RATE_LIMITED");
    expect(boundary.sanitise).not.toHaveBeenCalled();
    expect(boundary.analyse).not.toHaveBeenCalled();
  });
  it("counts failed provider calls against the daily budget", async () => {
    vi.stubEnv("ANALYSIS_DAILY_LIMIT", "1");
    boundary.analyse.mockRejectedValueOnce(new RequestFailure(502, "PROVIDER_UNAVAILABLE", "Retry later."));
    expect((await POST(request())).status).toBe(502);
    const exhausted = await POST(request());
    expect(exhausted.status).toBe(429);
    expect((await exhausted.json()).code).toBe("DAILY_LIMIT");
    expect(boundary.analyse).toHaveBeenCalledTimes(1);
  });
  it("safely hides unexpected implementation details", async () => {
    boundary.analyse.mockRejectedValue(new Error("sensitive provider details"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ code: "SCAN_FAILED", error: "The scan could not be completed. Please try again." });
  });
  it("returns rate-limit retry guidance", async () => {
    vi.stubEnv("ANALYSIS_RATE_LIMIT", "1");
    await POST(request());
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect((await response.json()).code).toBe("RATE_LIMITED");
    expect(boundary.analyse).toHaveBeenCalledTimes(1);
  });
  it("continues to work after a provider error", async () => {
    boundary.analyse.mockRejectedValueOnce(new RequestFailure(504, "SCAN_TIMEOUT", "Please retry."));
    expect((await POST(request())).status).toBe(504);
    expect((await POST(request())).status).toBe(200);
  });
  it("returns an optional server-bound receipt only after successful live analysis", async () => {
    boundary.receipt.mockResolvedValue({ receiptId: "11111111-1111-4111-8111-111111111111", receiptExpiresAt: "2026-11-01T16:00:00Z" });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ source: "live", receiptId: "11111111-1111-4111-8111-111111111111" });
    expect(boundary.receipt).toHaveBeenCalledWith(expect.any(Request), "data:image/jpeg;base64,cleaned", { defectType: "pothole" });
  });
  it("preserves a live assessment when optional receipt storage is unavailable", async () => {
    boundary.receipt.mockResolvedValue({ receiptUnavailable: true });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ analysis: { defectType: "pothole" }, source: "live", receiptUnavailable: true });
  });
});

describe("public configuration", () => {
  it("exposes only key availability", async () => {
    expect(await (await GET()).json()).toEqual({ liveAvailable: true });
    vi.stubEnv("OPENAI_API_KEY", "");
    const response = await GET();
    expect(await response.json()).toEqual({ liveAvailable: false });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
