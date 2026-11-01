import { createHash } from "node:crypto";
import { RequestFailure } from "../security/errors";

const TRUSTED_HOSTS = new Set([
  "api.postcodes.io", "photon.komoot.io", "local-links-manager.publishing.service.gov.uk",
]);
const MAX_RESPONSE_BYTES = 64 * 1024;
const CACHE_TTL = 10 * 60_000;
const cache = new Map<string, { expires: number; value: unknown; timer: ReturnType<typeof setTimeout> }>();
const pending = new Map<string, Promise<unknown>>();
let nextPhotonRequest = 0;

/** Fetch only fixed provider hosts. Returned council links are never fetched. */
async function fetchProvider(url: URL): Promise<unknown> {
  if (url.protocol !== "https:" || !TRUSTED_HOSTS.has(url.hostname) || url.username || url.password || url.port) {
    throw new RequestFailure(400, "INVALID_PROVIDER", "That location provider is not supported.");
  }
  if (url.hostname === "photon.komoot.io") {
    if (Date.now() < nextPhotonRequest) {
      throw new RequestFailure(429, "LOCATION_BUSY", "Wait a moment before searching for another address.");
    }
    nextPhotonRequest = Date.now() + 1000;
  }
  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(7000),
      headers: {
        Accept: "application/json",
        "User-Agent": "PotholeKiller/0.1 (https://github.com/ShabalalaWATP/PotholeKiller)",
      },
    });
  } catch {
    throw new RequestFailure(503, "LOCATION_UNAVAILABLE", "Location lookup is temporarily unavailable. Try a full UK postcode or confirm the map pin manually.");
  }
  if (response.status === 404) return null;
  if (!response.ok || Number(response.headers.get("content-length") ?? 0) > MAX_RESPONSE_BYTES || !response.body) {
    throw new RequestFailure(503, "LOCATION_UNAVAILABLE", "The location provider could not complete the search. Please try again.");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > MAX_RESPONSE_BYTES || chunks.length >= 1024) {
        await reader.cancel();
        throw new Error("Provider response too large");
      }
      chunks.push(chunk.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestFailure(503, "INVALID_LOCATION_RESPONSE", "The location provider returned an unreadable response. Please try again.");
  } finally {
    reader.releaseLock();
  }
}

/** A short, bounded memory cache avoids repeated public-provider calls. */
export async function providerJson(url: URL): Promise<unknown> {
  // Raw road addresses are not kept as cache keys or written to logs/disk.
  const key = createHash("sha256").update(url.href).digest("hex");
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.value;
  if (entry) { clearTimeout(entry.timer); cache.delete(key); }
  const existing = pending.get(key);
  if (existing) return existing;
  const operation = fetchProvider(url).then(value => {
    if (cache.size >= 128) {
      const oldest = cache.keys().next().value!;
      clearTimeout(cache.get(oldest)!.timer);
      cache.delete(oldest);
    }
    // Delete response values on expiry even if this process receives no further searches.
    const timer = setTimeout(() => cache.delete(key), CACHE_TTL);
    timer.unref();
    cache.set(key, { expires: Date.now() + CACHE_TTL, value, timer });
    return value;
  }).finally(() => pending.delete(key));
  pending.set(key, operation);
  return operation;
}
