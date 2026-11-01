import { CommunityFailure } from "./errors";

const MAX_JSON_BYTES = 4096;

export async function readCommunityJson(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new CommunityFailure(415, "JSON_REQUIRED", "Send the collector details as JSON.");
  }
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_JSON_BYTES)) {
    throw new CommunityFailure(413, "BODY_TOO_LARGE", "These collector details are too large.");
  }
  if (!request.body) throw new CommunityFailure(400, "INVALID_JSON", "Collector details are missing.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new CommunityFailure(408, "BODY_TIMEOUT", "The request took too long. Please try again."));
      void reader.cancel().catch(() => undefined);
    }, 5000);
  });
  try {
    while (true) {
      const chunk = await Promise.race([reader.read(), timeout]);
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_JSON_BYTES || chunks.length >= 128) {
        void reader.cancel().catch(() => undefined);
        throw new CommunityFailure(413, "BODY_TOO_LARGE", "These collector details are too large.");
      }
      chunks.push(chunk.value);
    }
    try {
      return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
    } catch {
      throw new CommunityFailure(400, "INVALID_JSON", "These collector details could not be read.");
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

/** A bounded per-instance guard supplements the platform IP limit. */
export function collectorRateLimiter() {
  const buckets = new Map<string, { expires: number; count: number }>();
  return (userId: string, now: number) => {
    for (const [key, value] of buckets) if (value.expires <= now) buckets.delete(key);
    const bucket = buckets.get(userId) ?? { expires: now + 60_000, count: 0 };
    if (bucket.count >= 30 || (!buckets.has(userId) && buckets.size >= 1000)) {
      throw new CommunityFailure(429, "COMMUNITY_RATE_LIMIT", "Wait a minute before updating your shared collection again.");
    }
    bucket.count += 1;
    buckets.set(userId, bucket);
  };
}
