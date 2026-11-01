import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let readLocationInput: typeof import("../lib/location/request").readLocationInput;
let reserveLocationLookup: typeof import("../lib/location/request").reserveLocationLookup;
const request = (value: unknown) => new Request("https://pothole.example/api/location", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value),
});

beforeEach(async () => {
  vi.resetModules();
  ({ readLocationInput, reserveLocationLookup } = await import("../lib/location/request"));
});
afterEach(() => vi.useRealTimers());

describe("bounded address lookup request", () => {
  it("parses a small address or pin request", async () => {
    expect(await readLocationInput(request({ query: "E8 1DY" }))).toEqual({ query: "E8 1DY" });
    expect(await readLocationInput(request({ lat: 55, lng: -4 }))).toEqual({ lat: 55, lng: -4 });
  });
  it.each([
    new Request("https://pothole.example/api/location", { method: "POST" }),
    new Request("https://pothole.example/api/location", { method: "POST", body: "plain text" }),
    new Request("https://pothole.example/api/location", { method: "POST", headers: { "content-type": "application/json" }, body: "bad JSON" }),
  ])("rejects empty, unsupported or malformed bodies", async invalid => {
    await expect(readLocationInput(invalid)).rejects.toMatchObject({ status: 400 });
  });
  it("bounds the actual request body without relying on Content-Length", async () => {
    await expect(readLocationInput(request({ query: "a".repeat(3000) }))).rejects.toMatchObject({ status: 413 });
  });
  it("rejects unknown fields and pins outside the UK search bounds", async () => {
    await expect(readLocationInput(request({ query: "London", url: "https://attacker.example" }))).rejects.toMatchObject({ status: 400 });
    await expect(readLocationInput(request({ lat: 0, lng: 0 }))).rejects.toMatchObject({ status: 400 });
  });
  it("rejects a stalled body even when its prefix is valid JSON", async () => {
    vi.useFakeTimers();
    const body = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(new TextEncoder().encode('{"query":"E8 1DY"}'));
    } });
    const stalled = new Request("https://pothole.example/api/location", {
      method: "POST", body, duplex: "half", headers: { "content-type": "application/json" },
    } as RequestInit & { duplex: "half" });
    const rejected = expect(readLocationInput(stalled)).rejects.toMatchObject({ status: 408 });
    await vi.advanceTimersByTimeAsync(5000);
    await rejected;
  });
  it("limits active work and releases slots once", () => {
    const first = reserveLocationLookup(1000);
    const second = reserveLocationLookup(1000);
    expect(() => reserveLocationLookup(1000)).toThrow(/busy/);
    first(); first();
    const third = reserveLocationLookup(1000);
    expect(() => reserveLocationLookup(1000)).toThrow(/busy/);
    second(); third();
  });
  it("limits shared public-demo attempts and resets its window", () => {
    for (let i = 0; i < 20; i++) reserveLocationLookup(1000)();
    expect(() => reserveLocationLookup(1000)).toThrow(/busy/);
    expect(() => reserveLocationLookup(61000)).not.toThrow();
  });
});
