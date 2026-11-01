import { ZodError } from "zod";
import { CommunityFailure } from "../community/errors";
import { collectorRateLimiter, readCommunityJson } from "../community/request";
import { AuthUserIdSchema } from "../community/schema";
import { monsterPower } from "../game/power";
import { RequestFailure } from "../security/errors";
import { requireSameOrigin } from "../security/request";
import type { RoadRepository } from "./repository";
import { RoadMutationSchema } from "./schema";

type Dependencies = {
  getUser: () => Promise<{ id: string; roles?: readonly string[] } | null>;
  repository: () => RoadRepository;
  now?: () => Date;
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });

export function createRoadIssueHandler(dependencies: Dependencies) {
  const checkRate = collectorRateLimiter();
  return async (request: Request): Promise<Response> => {
    if (!["GET", "POST"].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
    try {
      if (request.method === "GET") return json({ issues: await dependencies.repository().list() });
      requireSameOrigin(request);
      const user = await dependencies.getUser().catch(() => null);
      const userId = AuthUserIdSchema.safeParse(user?.id);
      if (!userId.success) throw new RequestFailure(401, "SIGN_IN_REQUIRED", "Sign in before publishing a public pin or confirming a repair.");
      const now = dependencies.now?.() ?? new Date();
      checkRate(userId.data, now.getTime());
      const input = RoadMutationSchema.parse(await readCommunityJson(request));
      if (input.action === "publish") {
        try { monsterPower(input.monsterProfile, now.toISOString()); }
        catch { throw new RequestFailure(400, "INVALID_OBSERVATION_DATE", "The first-noticed date cannot be in the future."); }
        return json(await dependencies.repository().publish(userId.data, input, now));
      }
      return json(await dependencies.repository().confirmFixed(userId.data, user?.roles ?? [], input.issueId, now));
    } catch (error) {
      if (error instanceof RequestFailure || error instanceof CommunityFailure) return json({ error: error.message, code: error.code }, error.status);
      if (error instanceof ZodError) return json({ error: "Check the road issue details and try again.", code: "INVALID_ROAD_ISSUE" }, 400);
      return json({ error: "Shared road issues are temporarily unavailable. Your local reports are safe.", code: "ROAD_ISSUES_UNAVAILABLE" }, 503);
    }
  };
}
