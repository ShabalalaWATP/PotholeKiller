import { analysePhotograph } from "../../../lib/ai/analyse";
import { RequestFailure } from "../../../lib/security/errors";
import { sanitiseImage } from "../../../lib/security/image";
import { chargeAnalysisAttempt, checkRateLimit, reserveAnalysis } from "../../../lib/security/limits";
import { readImageUpload, requireSameOrigin } from "../../../lib/security/request";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  try {
    requireSameOrigin(request);
    checkRateLimit(request);
    if (!process.env.OPENAI_API_KEY) {
      throw new RequestFailure(503, "NOT_CONFIGURED", "Live scanning is not configured yet. Try a labelled sample, or add the server API key.");
    }
    const release = reserveAnalysis();
    try {
      const photograph = await readImageUpload(request);
      const imageDataUrl = await sanitiseImage(photograph);
      chargeAnalysisAttempt();
      const analysis = await analysePhotograph(imageDataUrl);
      return Response.json({ analysis, source: "live" }, { headers: { "Cache-Control": "no-store" } });
    } finally {
      release();
    }
  } catch (error) {
    const failure = error instanceof RequestFailure ? error :
      new RequestFailure(500, "SCAN_FAILED", "The scan could not be completed. Please try again.");
    return Response.json({ error: failure.message, code: failure.code }, {
      status: failure.status,
      headers: {
        "Cache-Control": "no-store",
        ...(failure.status === 429 ? { "Retry-After": "60" } : {}),
      },
    });
  }
}
