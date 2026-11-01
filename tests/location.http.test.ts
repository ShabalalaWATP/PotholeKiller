import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let providerJson: typeof import("../lib/location/http").providerJson;
const network = vi.fn();
const postcode = (value = "E81DY") => new URL(`https://api.postcodes.io/postcodes/${value}`);

beforeEach(async () => {
  vi.resetModules();
  network.mockReset();
  vi.stubGlobal("fetch", network);
  ({ providerJson } = await import("../lib/location/http"));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("fixed-host location fetch boundary", () => {
  it.each([
    "http://api.postcodes.io/postcodes/E81DY", "https://attacker.example", "https://127.0.0.1",
    "https://user:password@api.postcodes.io/postcodes/E81DY", "https://api.postcodes.io:8443/postcodes/E81DY",
    "https://api.postcodes.io.attacker.example/postcodes/E81DY",
  ])("rejects arbitrary, private or insecure destinations %s", async url => {
    await expect(providerJson(new URL(url))).rejects.toMatchObject({ code: "INVALID_PROVIDER" });
    expect(network).not.toHaveBeenCalled();
  });
  it("identifies the app, sets a deadline and refuses redirects", async () => {
    network.mockResolvedValue(new Response('{"result":true}'));
    expect(await providerJson(postcode())).toEqual({ result: true });
    expect(network.mock.calls[0][1]).toMatchObject({ redirect: "error", headers: { Accept: "application/json" } });
    expect(network.mock.calls[0][1].headers["User-Agent"]).toContain("PotholeKiller/0.1");
    expect(network.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
  it("coalesces identical in-flight requests and caches the result", async () => {
    let resolve!: (response: Response) => void;
    network.mockReturnValue(new Promise<Response>(done => { resolve = done; }));
    const first = providerJson(postcode());
    const second = providerJson(postcode());
    resolve(new Response('{"result":"same"}'));
    expect(await first).toEqual(await second);
    expect(await providerJson(postcode())).toEqual({ result: "same" });
    expect(network).toHaveBeenCalledTimes(1);
  });
  it("actively expires cached private lookup responses without a subsequent request", async () => {
    vi.useFakeTimers();
    network.mockImplementation(async () => new Response('{"result":true}'));
    await providerJson(postcode());
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    await providerJson(postcode());
    expect(network).toHaveBeenCalledTimes(2);
  });
  it("also rejects stale cache entries if the clock advances before their timer runs", async () => {
    let now = 1000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    network.mockImplementation(async () => new Response('{"result":true}'));
    await providerJson(postcode());
    now += 10 * 60_000 + 1;
    await providerJson(postcode());
    expect(network).toHaveBeenCalledTimes(2);
  });
  it("keeps the response cache bounded", async () => {
    network.mockImplementation(async () => new Response('{"result":true}'));
    for (let i = 0; i < 129; i++) await providerJson(postcode(String(i)));
    await providerJson(postcode("0"));
    expect(network).toHaveBeenCalledTimes(130);
  });
  it("rate-limits uncached address queries and permits a later explicit search", async () => {
    let now = 1000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    network.mockImplementation(async () => new Response('{"features":[]}'));
    await providerJson(new URL("https://photon.komoot.io/api/?q=first"));
    await expect(providerJson(new URL("https://photon.komoot.io/api/?q=second"))).rejects.toMatchObject({ status: 429 });
    now += 1000;
    await expect(providerJson(new URL("https://photon.komoot.io/api/?q=second"))).resolves.toEqual({ features: [] });
  });
  it("does not log or expose provider failure details and permits retries", async () => {
    network.mockRejectedValueOnce(new Error("private query details"));
    await expect(providerJson(postcode())).rejects.toMatchObject({ code: "LOCATION_UNAVAILABLE", status: 503 });
    network.mockResolvedValue(new Response("null"));
    await expect(providerJson(postcode())).resolves.toBeNull();
  });
  it("returns a bounded not-found result", async () => {
    network.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(providerJson(postcode())).resolves.toBeNull();
  });
  it.each([
    new Response("error", { status: 500 }),
    new Response(null, { status: 200 }),
    new Response("{}", { headers: { "content-length": "65537" } }),
    new Response(null, { status: 302, headers: { location: "https://attacker.example" } }),
  ])("rejects unavailable, empty, redirected or oversized responses", async response => {
    network.mockResolvedValue(response);
    await expect(providerJson(postcode())).rejects.toMatchObject({ status: 503 });
  });
  it.each(["not JSON", new Uint8Array(65537)])("bounds and validates actual provider response bytes", async body => {
    network.mockResolvedValue(new Response(body));
    await expect(providerJson(postcode())).rejects.toMatchObject({ code: "INVALID_LOCATION_RESPONSE" });
  });
});
