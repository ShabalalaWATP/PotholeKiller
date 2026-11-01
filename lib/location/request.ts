import { RequestFailure } from "../security/errors";
import { LocationInputSchema, type LocationInput } from "./schema";

let windowStart = 0;
let attempts = 0;
let active = 0;

/** A small public-demo backstop. Shared platform protection is needed at scale. */
export function reserveLocationLookup(now = Date.now()): () => void {
  if (now >= windowStart + 60_000) { windowStart = now; attempts = 0; }
  if (attempts >= 20 || active >= 2) {
    throw new RequestFailure(429, "LOCATION_BUSY", "Location search is busy. Wait a moment, then try again.");
  }
  attempts += 1;
  active += 1;
  let released = false;
  return () => { if (!released) active -= 1; released = true; };
}

export async function readLocationInput(request: Request): Promise<LocationInput> {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json") || !request.body) {
    throw new RequestFailure(400, "INVALID_LOCATION", "Enter a UK road address, postcode or map pin.");
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => undefined); }, 5000);
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 2048 || chunks.length >= 64) {
        void reader.cancel().catch(() => undefined);
        throw new RequestFailure(413, "LOCATION_TOO_LARGE", "Use a short road address or postcode.");
      }
      chunks.push(chunk.value);
    }
    if (timedOut) throw new RequestFailure(408, "LOCATION_TIMEOUT", "The location request took too long. Please try again.");
    const parsed = LocationInputSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!parsed.success) throw new Error("Invalid location input");
    return parsed.data;
  } catch (error) {
    if (error instanceof RequestFailure) throw error;
    throw new RequestFailure(400, "INVALID_LOCATION", "Use a UK road address, full postcode, or a pin within the UK.");
  } finally {
    clearTimeout(timeout);
    reader.releaseLock();
  }
}
