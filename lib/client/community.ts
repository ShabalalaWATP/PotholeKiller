import { z } from "zod";
import { CommunitySnapshotSchema, ProfileUpdateSchema, ClaimCaptureSchema } from "@/lib/community/schema";
import type { ReportRecord } from "@/lib/reporting/report";

export const LocalProfileSchema = ProfileUpdateSchema.pick({ displayName: true, avatar: true }).strict();
const StoredProfileSchema = LocalProfileSchema.extend({ version: z.literal(1) }).strict();
export type LocalProfile = z.infer<typeof LocalProfileSchema>;
export type CommunitySnapshot = z.infer<typeof CommunitySnapshotSchema>;
export type ProfileUpdate = z.input<typeof ProfileUpdateSchema>;
export const LOCAL_PROFILE_KEY = "potholekiller.profile.v1";
export const defaultLocalProfile: LocalProfile = { displayName: "Crater Cadet", avatar: "gremlin" };
let localSnapshot: LocalProfile | undefined;
const listeners = new Set<() => void>();

export function readLocalProfile(storage: Pick<Storage, "getItem">): LocalProfile {
  try {
    const value = storage.getItem(LOCAL_PROFILE_KEY);
    if (!value || value.length > 1000) return defaultLocalProfile;
    const parsed = StoredProfileSchema.safeParse(JSON.parse(value));
    return parsed.success ? LocalProfileSchema.parse({ displayName: parsed.data.displayName, avatar: parsed.data.avatar }) : defaultLocalProfile;
  } catch { return defaultLocalProfile; }
}

export function getLocalProfile() {
  if (!localSnapshot) {
    try { localSnapshot = readLocalProfile(window.localStorage); } catch { localSnapshot = defaultLocalProfile; }
  }
  return localSnapshot;
}

export function subscribeLocalProfile(listener: () => void) {
  listeners.add(listener);
  function changed(event: StorageEvent) {
    if (event.key === LOCAL_PROFILE_KEY || event.key === null) {
      localSnapshot = undefined;
      listeners.forEach(callback => callback());
    }
  }
  window.addEventListener("storage", changed);
  return () => { listeners.delete(listener); window.removeEventListener("storage", changed); };
}

export function persistLocalProfile(value: unknown) {
  const profile = LocalProfileSchema.parse(value);
  localSnapshot = profile;
  let saved = true;
  try { window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify({ version: 1, ...profile })); } catch { saved = false; }
  listeners.forEach(listener => listener());
  return saved;
}

export class CommunityError extends Error {
  constructor(message: string, readonly status?: number, readonly code?: string) { super(message); }
}

async function request(method: "GET" | "PUT" | "POST", body?: unknown) {
  let response: Response;
  try {
    response = await fetch("/api/community", {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
  } catch { throw new CommunityError("The community service is unavailable. Your local collection is safe."); }
  if (!response.ok) {
    const parsed = z.object({ code: z.string().max(80) }).safeParse(await response.json().catch(() => null));
    const code = parsed.success ? parsed.data.code : undefined;
    const codeMessages: Record<string, string> = {
      SIGN_IN_REQUIRED: "Sign in again to update your community profile or score.",
      PROFILE_REQUIRED: "Save your collector profile first, then retry this capture.",
      RECEIPT_UNAVAILABLE: "This scan receipt is invalid or expired. Scan the real photograph again while signed in.",
      FUTURE_CAPTURE: "Check your device's date and time before retrying this capture.",
      INVALID_OBSERVATION_DATE: "The first-noticed date must be on or before report preparation.",
      INVALID_COLLECTOR_DETAILS: "Check your nickname and collector details, then try again.",
      COMMUNITY_RATE_LIMIT: "Wait a minute before updating your community score again.",
      COMMUNITY_UNAVAILABLE: "The community service is unavailable. Your local collection is safe.",
      BODY_TIMEOUT: "The community request took too long. Please retry.",
    };
    const messages: Record<number, string> = {
      400: "Check your collector details and try again.",
      401: "Sign in again to update your community profile or score.",
      403: "This capture cannot be added to the signed-in collector's score.",
      404: "Community profiles are available on the hosted app. Local hunting still works.",
      409: "Save your collector profile first, then retry this capture.",
      410: "This scan receipt has expired. Only recent signed-in live scans can count.",
      422: "Check the nickname or capture details and try again.",
      429: "Please wait before trying the community service again.",
    };
    const friendly = code && Object.hasOwn(codeMessages, code) ? codeMessages[code] : undefined;
    throw new CommunityError(friendly || messages[response.status] || "The community update could not be saved. Your local collection is safe.", response.status, code);
  }
  try { return await response.json() as unknown; }
  catch { throw new CommunityError("The community service returned an unreadable response. Please retry."); }
}

function snapshotFrom(value: unknown): CommunitySnapshot {
  if (!value || typeof value !== "object") throw new CommunityError("The community response could not be verified.");
  const raw = value as Record<string, unknown>;
  const parsed = CommunitySnapshotSchema.safeParse({ authenticated: raw.authenticated, profile: raw.profile, leaderboard: raw.leaderboard });
  if (!parsed.success) throw new CommunityError("The community response could not be verified.");
  return parsed.data;
}

export async function loadCommunity() { return snapshotFrom(await request("GET")); }
export async function saveCommunityProfile(value: ProfileUpdate) {
  return snapshotFrom(await request("PUT", ProfileUpdateSchema.parse(value)));
}

export function claimForReport(report: ReportRecord) {
  if (report.isDemo || !report.scanReceiptId) return null;
  const parsed = ClaimCaptureSchema.safeParse({ receiptId: report.scanReceiptId, monsterProfile: report.monsterProfile, preparedAtISO: report.preparedAt });
  return parsed.success ? parsed.data : null;
}

/** Receipt ownership and expiry belong to the server, not the report's older date. */
export function communitySyncCandidates(reports: readonly ReportRecord[], pendingIds: ReadonlySet<string>) {
  return reports.filter(report => claimForReport(report) !== null)
    .sort((left, right) => Number(pendingIds.has(right.id)) - Number(pendingIds.has(left.id)))
    .slice(0, 100);
}

export function shouldRetryCommunityClaim(cause: unknown) {
  if (!(cause instanceof CommunityError)) return true;
  if (cause.code === "PROFILE_REQUIRED") return true;
  if (cause.code === "RECEIPT_UNAVAILABLE") return false;
  return ![403, 410, 422].includes(cause.status ?? 0);
}

export async function claimCommunityReport(report: ReportRecord) {
  const claim = claimForReport(report);
  if (!claim) throw new CommunityError("Only real uploads scanned while signed in can count on the community board.");
  const raw = await request("POST", claim);
  const reward = z.object({ awardedXp: z.number().int().min(0).max(110), duplicate: z.boolean() }).safeParse(raw);
  if (!reward.success) throw new CommunityError("The capture response could not be verified. You can safely retry.");
  return { ...snapshotFrom(raw), ...reward.data };
}
