import { lookupLocation } from "../../../lib/location/lookup";
import { readLocationInput, reserveLocationLookup } from "../../../lib/location/request";
import { RequestFailure } from "../../../lib/security/errors";
import { requireSameOrigin } from "../../../lib/security/request";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  try {
    requireSameOrigin(request);
    const release = reserveLocationLookup();
    try {
      const result = await lookupLocation(await readLocationInput(request));
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    } finally { release(); }
  } catch (error) {
    const failure = error instanceof RequestFailure ? error :
      new RequestFailure(503, "LOCATION_UNAVAILABLE", "Location lookup is temporarily unavailable. Confirm the map pin manually or try again.");
    return Response.json({ error: failure.message, code: failure.code }, {
      status: failure.status,
      headers: { "Cache-Control": "no-store", ...(failure.status === 429 ? { "Retry-After": "60" } : {}) },
    });
  }
}
