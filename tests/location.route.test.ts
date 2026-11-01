import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const lookup = vi.hoisted(() => vi.fn());
vi.mock("../lib/location/lookup", () => ({ lookupLocation: lookup }));
let POST: typeof import("../app/api/location/route").POST;
let RequestFailure: typeof import("../lib/security/errors").RequestFailure;
const request = (data: unknown, origin = "https://pothole.example") => new Request("https://pothole.example/api/location", {
  method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(data),
});

beforeEach(async () => {
  vi.resetModules();
  lookup.mockReset();
  vi.stubEnv("APP_ORIGIN", "");
  vi.stubEnv("DEPLOY_PRIME_URL", "");
  ({ POST } = await import("../app/api/location/route"));
  ({ RequestFailure } = await import("../lib/security/errors"));
  lookup.mockResolvedValue({ candidates: [], attribution: "Postcodes.io", warnings: [] });
});
afterEach(() => vi.unstubAllEnvs());

describe("location lookup API", () => {
  it("returns a no-store lookup result without sending any report", async () => {
    const response = await POST(request({ query: "E8 1DY" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ candidates: [], attribution: "Postcodes.io", warnings: [] });
    expect(lookup).toHaveBeenCalledWith({ query: "E8 1DY" });
  });
  it("rejects cross-site requests before any provider calls", async () => {
    expect((await POST(request({ query: "E8 1DY" }, "https://attacker.example"))).status).toBe(403);
    expect(lookup).not.toHaveBeenCalled();
  });
  it("rejects invalid JSON shapes before lookup", async () => {
    expect((await POST(request({ url: "https://attacker.example" }))).status).toBe(400);
    expect(lookup).not.toHaveBeenCalled();
  });
  it("preserves safe errors and releases capacity for retries", async () => {
    lookup.mockRejectedValueOnce(new RequestFailure(404, "LOCATION_NOT_FOUND", "No matching place."));
    expect((await POST(request({ query: "E8 1DY" }))).status).toBe(404);
    expect((await POST(request({ query: "E8 1DY" }))).status).toBe(200);
  });
  it("hides unexpected errors and does not expose address/provider details", async () => {
    lookup.mockRejectedValueOnce(new Error("private address and provider stack"));
    const response = await POST(request({ query: "E8 1DY" }));
    expect(response.status).toBe(503);
    expect((await response.json()).error).not.toContain("private");
  });
  it("returns retry guidance when the demo rate budget is exhausted", async () => {
    for (let i = 0; i < 20; i++) await POST(request({ query: "E8 1DY" }));
    const response = await POST(request({ query: "E8 1DY" }));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
  });
});
