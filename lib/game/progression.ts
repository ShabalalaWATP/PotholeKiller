import { z } from "zod";
import { ReportRecordSchema, type ReportRecord, type ReportStatus } from "../reporting/report";
import { BASE_CAPTURE_XP, monsterPower } from "./power";

export const CAPTURE_XP = BASE_CAPTURE_XP;
export const MAX_CAPTURES = 100;
export const GameStateSchema = z.object({
  version: z.literal(1),
  captures: z.array(ReportRecordSchema).max(MAX_CAPTURES),
  rejectedScan: z.boolean(),
}).refine((state) => new Set(state.captures.map((record) => record.imageHash)).size === state.captures.length, {
  message: "A photograph can only earn one capture.",
});

export type GameState = z.infer<typeof GameStateSchema>;
export type Achievement = "first_blood" | "asphalt_avenger" | "nice_try";

export function emptyGameState(): GameState {
  return { version: 1, captures: [], rejectedScan: false };
}

export function playerProgress(state: GameState) {
  const xp = state.captures.reduce((total, record) => total + captureXpForReport(record), 0);
  const level = Math.min(5, Math.floor(xp / 120) + 1);
  const ranks = ["Crater Cadet", "Road Ranger", "Asphalt Avenger", "Pothole Predator", "Lord of the Holes"];
  return {
    xp,
    level,
    rank: ranks[level - 1],
    levelXp: level === 5 ? 120 : xp % 120,
    nextLevelXp: level === 5 ? null : level * 120,
    progress: level === 5 ? 100 : (xp % 120) / 120 * 100,
    collected: state.captures.length,
  };
}

/** Freeze rewards to the reviewed observations at capture, with no passive XP. */
export function captureXpForReport(record: Pick<ReportRecord, "monsterProfile" | "preparedAt">): number {
  return monsterPower(record.monsterProfile, record.preparedAt).captureXp;
}

export function achievements(state: GameState): Achievement[] {
  const result: Achievement[] = [];
  if (state.captures.length >= 1) result.push("first_blood");
  if (state.captures.length >= 3) result.push("asphalt_avenger");
  if (state.rejectedScan) result.push("nice_try");
  return result;
}

/** Identity is based on image bytes, so moving a pin cannot farm more XP. */
export function addCapture(state: GameState, report: ReportRecord) {
  const validatedState = GameStateSchema.parse(state);
  const validatedReport = ReportRecordSchema.parse(report);
  if (validatedState.captures.some((record) => record.imageHash === validatedReport.imageHash)) {
    return { state: validatedState, awardedXp: 0, duplicate: true };
  }
  if (validatedState.captures.length >= MAX_CAPTURES) {
    throw new Error("Your PotholeDex has reached its 100-report local storage limit.");
  }
  return {
    state: { ...validatedState, captures: [...validatedState.captures, validatedReport] },
    awardedXp: captureXpForReport(validatedReport),
    duplicate: false,
  };
}

export function recordRejection(state: GameState): GameState {
  return { ...GameStateSchema.parse(state), rejectedScan: true };
}

/** Retain a fresh live-scan receipt without changing the original capture or its reward. */
export function attachScanReceipt(state: GameState, id: string, receiptId: string): { state: GameState; report: ReportRecord } {
  const validated = GameStateSchema.parse(state);
  const validReceiptId = z.uuid().parse(receiptId);
  const current = validated.captures.find(record => record.id === id);
  if (!current) throw new Error("This report is not in your PotholeDex.");
  const report = { ...current, scanReceiptId: validReceiptId };
  return {
    state: { ...validated, captures: validated.captures.map(record => record.id === id ? report : record) },
    report,
  };
}

export function updateReportStatus(state: GameState, id: string, status: ReportStatus): GameState {
  const validated = GameStateSchema.parse(state);
  const current = validated.captures.find((record) => record.id === id);
  if (!current) throw new Error("This report is not in your PotholeDex.");
  const order: ReportStatus[] = ["draft_prepared", "email_handoff", "submitted_by_user"];
  if (!order.includes(status)) throw new Error("Unknown report status.");
  if (current.isDemo && status !== "draft_prepared") {
    throw new Error("Demonstration reports must not be sent to a real council.");
  }
  if (order.indexOf(status) < order.indexOf(current.status)) {
    throw new Error("A report status cannot move backwards.");
  }
  return GameStateSchema.parse({
    ...validated,
    captures: validated.captures.map((record) => record.id === id ? { ...record, status } : record),
  });
}
