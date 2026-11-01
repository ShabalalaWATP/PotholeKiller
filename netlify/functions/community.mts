import type { Config } from "@netlify/functions";
import { getUser } from "@netlify/identity";
import { databaseCommunityRepository } from "../../lib/community/database";
import { createCommunityHandler } from "../../lib/community/handler";

const handler = createCommunityHandler({
  getUser,
  repository: () => databaseCommunityRepository,
});

export default async function community(request: Request): Promise<Response> {
  return handler(request);
}

export const config: Config = {
  path: "/api/community",
  rateLimit: { action: "rate_limit", aggregateBy: ["ip"], windowSize: 60, windowLimit: 120 },
};
