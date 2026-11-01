import type { Config } from "@netlify/functions";
import { getUser } from "@netlify/identity";
import { databaseRoadRepository } from "../../lib/roads/database";
import { createRoadIssueHandler } from "../../lib/roads/handler";

const handler = createRoadIssueHandler({ getUser, repository: () => databaseRoadRepository });
export default async function roadIssues(request: Request): Promise<Response> { return handler(request); }

export const config: Config = {
  path: "/api/road-issues",
  rateLimit: { action: "rate_limit", aggregateBy: ["ip"], windowSize: 60, windowLimit: 120 },
};
