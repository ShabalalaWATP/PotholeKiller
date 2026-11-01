import { ZodError } from "zod";
import { monsterPower } from "../game/power";
import { RequestFailure } from "../security/errors";
import { requireSameOrigin } from "../security/request";
import { CommunityFailure } from "./errors";
import type { CommunityRepository } from "./repository";
import { collectorRateLimiter, readCommunityJson } from "./request";
import { AuthUserIdSchema, CaptureClaimSchema, ProfileInputSchema, publicLeaderboard, publicProfile } from "./schema";

type Dependencies = {
  getUser: () => Promise<{ id: string } | null>;
  repository: () => CommunityRepository;
  now?: () => Date;
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}

async function snapshot(repository: CommunityRepository, userId: string | null) {
  const [profile, leaderboard] = await Promise.all([
    userId ? repository.getProfile(userId) : Promise.resolve(null),
    repository.leaderboard(),
  ]);
  return { authenticated: userId !== null, profile: profile ? publicProfile(profile) : null, leaderboard: publicLeaderboard(leaderboard) };
}

export function createCommunityHandler(dependencies: Dependencies) {
  const checkRate = collectorRateLimiter();
  return async (request: Request): Promise<Response> => {
    if (!["GET", "PUT", "POST"].includes(request.method)) {
      return new Response(null, { status: 405, headers: { allow: "GET, PUT, POST", "cache-control": "no-store" } });
    }
    try {
      if (request.method !== "GET") requireSameOrigin(request);
      // Identity is unavailable under plain local Next.js; that is a guest session.
      const user = await dependencies.getUser().catch(() => null);
      const parsedId = AuthUserIdSchema.safeParse(user?.id);
      const userId = parsedId.success ? parsedId.data : null;
      if (request.method === "GET") return json(await snapshot(dependencies.repository(), userId));
      if (!userId) throw new CommunityFailure(401, "SIGN_IN_REQUIRED", "Sign in to save your shared collector profile.");
      const now = dependencies.now?.() ?? new Date();
      checkRate(userId, now.getTime());
      const body = await readCommunityJson(request);
      const repository = dependencies.repository();
      if (request.method === "PUT") {
        await repository.saveProfile(userId, ProfileInputSchema.parse(body));
        return json(await snapshot(repository, userId));
      }
      const claim = CaptureClaimSchema.parse(body);
      if (Date.parse(claim.preparedAtISO) > now.getTime()) {
        throw new CommunityFailure(400, "FUTURE_CAPTURE", "The report preparation time cannot be in the future.");
      }
      let awardedXp: number;
      try {
        awardedXp = monsterPower(claim.monsterProfile, claim.preparedAtISO).captureXp;
      } catch {
        throw new CommunityFailure(400, "INVALID_OBSERVATION_DATE", "The first-noticed date must be on or before report preparation.");
      }
      const result = await repository.claimCapture(userId, {
        receiptId: claim.receiptId, preparedAtISO: claim.preparedAtISO, awardedXp,
      }, now);
      return json({ ...await snapshot(repository, userId), ...result });
    } catch (error) {
      if (error instanceof CommunityFailure || error instanceof RequestFailure) {
        return json({ error: error.message, code: error.code }, error.status);
      }
      if (error instanceof ZodError) return json({ error: "Check your collector details and try again.", code: "INVALID_COLLECTOR_DETAILS" }, 400);
      return json({ error: "The shared collection is temporarily unavailable. Your local progress is safe.", code: "COMMUNITY_UNAVAILABLE" }, 503);
    }
  };
}
