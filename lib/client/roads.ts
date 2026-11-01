import { z } from "zod";
import {
  ConfirmFixedSchema, PublishRoadIssueSchema, RoadIssuesResponseSchema, RoadMutationResponseSchema,
  type RoadIssue, type RoadMutation,
} from "@/lib/roads/schema";
import { DEFECT_LABELS, ReportRecordSchema, type ReportRecord } from "@/lib/reporting/report";

export type RoadMutationResult = z.infer<typeof RoadMutationResponseSchema>;
export type RoadPublishResult = RoadMutationResult & { reportBonusXp: number; reporterOrdinal: number };

export class RoadServiceError extends Error {
  constructor(message: string, readonly status?: number, readonly code?: string) { super(message); }
}

const ErrorSchema = z.object({ code: z.string().max(80).optional() });
const errorMessages: Record<string, string> = {
  SIGN_IN_REQUIRED: "Sign in to publish a road issue or confirm a repair.",
  PROFILE_REQUIRED: "Save your collector profile before sharing this road issue.",
  RECEIPT_UNAVAILABLE: "This scan receipt is unavailable or expired. Scan the original photograph again while signed in.",
  ROAD_ISSUE_NOT_FOUND: "This road issue is no longer available. Refresh the map and try again.",
  ROAD_SERVICE_UNAVAILABLE: "Shared road reports are temporarily unavailable. Your local collection is safe.",
  COMMUNITY_UNAVAILABLE: "Shared road reports are temporarily unavailable. Your local collection is safe.",
};

async function request(body?: RoadMutation): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch("/api/road-issues", {
      method: body ? "POST" : "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch { throw new RoadServiceError("Shared road reports could not be reached. Please try again."); }
  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ErrorSchema.safeParse(raw);
    const code = parsed.success ? parsed.data.code : undefined;
    const messages: Record<number, string> = {
      400: "Check the road pin and report details, then try again.",
      401: "Sign in again before sharing a road report or confirming a repair.",
      403: "This road action is unavailable for the signed-in collector.",
      404: "Shared road reports need the hosted service. You can explore the mock map here.",
      409: "This report could not be linked. Refresh the road issue and try again.",
      410: "This scan receipt has expired. Scan the original photograph again while signed in.",
      422: "Check the confirmed road pin and report details, then try again.",
      429: "Please wait a moment before updating road reports again.",
    };
    const friendly = code && Object.hasOwn(errorMessages, code) ? errorMessages[code] : undefined;
    throw new RoadServiceError(friendly || messages[response.status] || "The road update could not be saved. Please try again.", response.status, code);
  }
  return raw;
}

function validateIssueDates(issues: readonly RoadIssue[]) {
  if (issues.some(issue => issue.monsterProfile.firstObservedOn !== null &&
    issue.monsterProfile.firstObservedOn > issue.createdAtISO.slice(0, 10))) {
    throw new RoadServiceError("The road response could not be verified. Please refresh the map.");
  }
}

export async function loadRoadIssues(): Promise<RoadIssue[]> {
  const parsed = RoadIssuesResponseSchema.safeParse(await request());
  if (!parsed.success) throw new RoadServiceError("The road response could not be verified. Please refresh the map.");
  validateIssueDates(parsed.data.issues);
  return parsed.data.issues;
}

async function mutateRoadIssue(body: RoadMutation): Promise<RoadMutationResult> {
  const parsed = RoadMutationResponseSchema.safeParse(await request(body));
  if (!parsed.success) throw new RoadServiceError("The road update could not be verified. You can safely retry.");
  validateIssueDates([parsed.data.issue]);
  return parsed.data;
}

/** The caller obtains explicit public-pin consent before calling this operation. */
export async function publishRoadIssue(report: ReportRecord, existingIssueId?: string): Promise<RoadPublishResult> {
  const parsed = ReportRecordSchema.safeParse(report);
  if (!parsed.success || parsed.data.isDemo || !parsed.data.scanReceiptId) {
    throw new RoadServiceError("Only a real report with a signed-in live-scan receipt can be shared.");
  }
  const data = parsed.data;
  if (!data.publishToMap) throw new RoadServiceError("Confirm that you want to share this exact road pin on the community map first.");
  const body = PublishRoadIssueSchema.safeParse({
    action: "publish", receiptId: data.scanReceiptId, existingIssueId: existingIssueId ?? data.communityIssueId,
    label: data.landmark || DEFECT_LABELS[data.analysis.defectType], location: data.location,
    type: data.analysis.defectType === "surface_crack" ? "cracking"
      : data.monsterProfile.extent === "unknown" ? "small" : data.monsterProfile.extent,
    monsterProfile: data.monsterProfile,
  });
  if (!body.success) throw new RoadServiceError("Choose an exact UK road pin and check the report details before sharing.");
  const result = await mutateRoadIssue(body.data);
  if (result.reportBonusXp === undefined || result.reporterOrdinal === undefined) {
    throw new RoadServiceError("The published report bonus could not be verified. You can safely retry.");
  }
  return { ...result, reportBonusXp: result.reportBonusXp, reporterOrdinal: result.reporterOrdinal };
}

export function confirmRoadIssueFixed(issueId: string) {
  const parsed = ConfirmFixedSchema.safeParse({ action: "confirm_fixed", issueId });
  if (!parsed.success) throw new RoadServiceError("Choose a real shared road issue before confirming a repair.");
  return mutateRoadIssue(parsed.data);
}
