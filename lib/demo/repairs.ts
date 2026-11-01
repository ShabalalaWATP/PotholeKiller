import { z } from "zod";
import { collectorLevel } from "../community/schema";
import { monsterPower } from "../game/power";
import { isCommunityFixed, REPAIR_CONFIRMATION_THRESHOLD, repairBonus, reportOrderBonus, voteWeight } from "../roads/rules";
import { demoIssues, demoUsers } from "./data";

export const DEMO_REPAIR_STORAGE_KEY = "potholekiller.demo-repairs.v1";
const MAX_STORAGE_CHARACTERS = 256_000;
const issueIds = new Set(demoIssues.map(issue => issue.id));
const usersById = new Map(demoUsers.map(user => [user.id, user]));
const voteSchema = z.object({ issueId: z.string().min(1).max(80), userId: z.string().min(1).max(80) }).strict();

function confirmationPoints(votes: { issueId: string; userId: string }[], issueId: string): number {
  return votes.filter(vote => vote.issueId === issueId).reduce((total, vote) => {
    const user = usersById.get(vote.userId);
    return total + voteWeight(user?.councilVerified ? ["council_verified"] : []);
  }, 0);
}

export const DemoRepairStateSchema = z.object({
  version: z.literal(1),
  votes: z.array(voteSchema).max(1200),
  additionalReporters: z.array(voteSchema).max(1200).default([]),
  clearedIssueIds: z.array(z.string().min(1).max(80)).max(60),
}).strict().superRefine((state, context) => {
  const keys = new Set<string>();
  for (const vote of state.votes) {
    const key = `${vote.issueId}:${vote.userId}`;
    if (!issueIds.has(vote.issueId) || !usersById.has(vote.userId) || keys.has(key)) {
      context.addIssue({ code: "custom", message: "Demo confirmations must belong to distinct known users and issues." });
    }
    keys.add(key);
  }
  const reporters = new Set<string>();
  for (const report of state.additionalReporters) {
    const key = `${report.issueId}:${report.userId}`;
    const original = demoIssues.find(issue => issue.id === report.issueId);
    if (!original || !usersById.has(report.userId) || original.reporterIds.includes(report.userId) || reporters.has(key)) {
      context.addIssue({ code: "custom", message: "Mock reports must belong to distinct known users and issues." });
    }
    reporters.add(key);
  }
  const cleared = new Set(state.clearedIssueIds);
  const expected = demoIssues.filter(issue => isCommunityFixed(confirmationPoints(state.votes, issue.id))).map(issue => issue.id);
  if (cleared.size !== state.clearedIssueIds.length || cleared.size !== expected.length || expected.some(id => !cleared.has(id))) {
    context.addIssue({ code: "custom", message: "Cleared demo issues must match their weighted confirmations." });
  }
});

export type DemoRepairState = z.infer<typeof DemoRepairStateSchema>;
export type DemoIssue = Omit<(typeof demoIssues)[number], "status"> & {
  status: "open" | "community_fixed";
  confirmationPoints: number;
  confirmationCount: number;
  reportCount: number;
};
export type DemoLeaderboardEntry = {
  position: number; id: string; displayName: string; avatar: (typeof demoUsers)[number]["avatar"];
  councilVerified: boolean; captures: number; xp: number; level: number; rank: string; issueIds: string[];
};
export type DemoVoteResult = {
  state: DemoRepairState; issue: DemoIssue; duplicate: boolean;
  newlyCleared: boolean; rewardAwarded: number; message: string;
};
export type DemoReportResult = {
  state: DemoRepairState; issue: DemoIssue; duplicate: boolean;
  reporterOrdinal: number; bonusXp: number; message: string;
};

export function emptyDemoRepairs(): DemoRepairState {
  return { version: 1, votes: [], additionalReporters: [], clearedIssueIds: [] };
}

export function demoWorldIssues(state: DemoRepairState): DemoIssue[] {
  return demoIssues.map(issue => ({
    ...issue,
    reporterIds: [...issue.reporterIds, ...state.additionalReporters.filter(report => report.issueId === issue.id).map(report => report.userId)],
    reportCount: issue.reporterIds.length + state.additionalReporters.filter(report => report.issueId === issue.id).length,
    status: state.clearedIssueIds.includes(issue.id) ? "community_fixed" : "open",
    confirmationPoints: confirmationPoints(state.votes, issue.id),
    confirmationCount: state.votes.filter(vote => vote.issueId === issue.id).length,
  }));
}

export function demoLeaderboard(state: DemoRepairState): DemoLeaderboardEntry[] {
  const issues = demoWorldIssues(state);
  return demoUsers.map(user => {
    const owned = issues.filter(issue => issue.reporterIds.includes(user.id));
    const xp = owned.reduce((total, issue) => {
      const originalXp = monsterPower(issue.monsterProfile, issue.createdAtISO).captureXp + reportOrderBonus(issue.reporterIds.indexOf(user.id) + 1);
      return total + originalXp + (state.clearedIssueIds.includes(issue.id) ? repairBonus(originalXp) : 0);
    }, 0);
    return { ...user, captures: owned.length, xp, ...collectorLevel(xp), issueIds: owned.map(issue => issue.id) };
  }).sort((a, b) => b.captures - a.captures || b.xp - a.xp || a.id.localeCompare(b.id))
    .map((user, index) => ({ ...user, position: index + 1 }));
}

export function confirmDemoRepair(state: DemoRepairState, issueId: string, userId: string): DemoVoteResult {
  const current = DemoRepairStateSchema.parse(state);
  const issue = demoWorldIssues(current).find(candidate => candidate.id === issueId);
  const user = usersById.get(userId);
  if (!issue || !user) throw new Error("Choose a known mock user and mock issue.");
  if (current.votes.some(vote => vote.issueId === issueId && vote.userId === userId)) {
    return { state: current, issue: demoWorldIssues(current).find(candidate => candidate.id === issueId)!, duplicate: true, newlyCleared: false, rewardAwarded: 0, message: `${user.displayName} has already confirmed this issue. No extra vote or XP.` };
  }
  const votes = [...current.votes, { issueId, userId }];
  const points = confirmationPoints(votes, issueId);
  const newlyCleared = !current.clearedIssueIds.includes(issueId) && isCommunityFixed(points);
  const next = DemoRepairStateSchema.parse({
    ...current, votes,
    clearedIssueIds: newlyCleared ? [...current.clearedIssueIds, issueId] : current.clearedIssueIds,
  });
  const captureXp = monsterPower(issue.monsterProfile, issue.createdAtISO).captureXp;
  const rewardAwarded = newlyCleared ? issue.reporterIds.reduce((sum, _userId, index) => sum + repairBonus(captureXp + reportOrderBonus(index + 1)), 0) : 0;
  const message = newlyCleared
    ? `Mock community confirmation reached ${points} points. +${rewardAwarded} demo XP to the original reporter${issue.reporterIds.length === 1 ? "" : "s"}. This is a community claim.`
    : `${user.displayName} added ${voteWeight(user.councilVerified ? ["council_verified"] : [])} confirmation point(s). ${points}/${REPAIR_CONFIRMATION_THRESHOLD}${current.clearedIssueIds.includes(issueId) ? "; no extra repair XP" : " needed to mark this issue community-fixed"}.`;
  return { state: next, issue: demoWorldIssues(next).find(candidate => candidate.id === issueId)!, duplicate: false, newlyCleared, rewardAwarded, message };
}

export function reportDemoIssue(state: DemoRepairState, issueId: string, userId: string): DemoReportResult {
  const current = DemoRepairStateSchema.parse(state);
  const issue = demoWorldIssues(current).find(candidate => candidate.id === issueId);
  const user = usersById.get(userId);
  if (!issue || !user) throw new Error("Choose a known mock user and mock issue.");
  const existing = issue.reporterIds.indexOf(userId);
  if (existing >= 0) return { state: current, issue, duplicate: true, reporterOrdinal: existing + 1, bonusXp: 0, message: `${user.displayName} already reported this mock issue. No extra report or XP.` };
  if (issue.status === "community_fixed") throw new Error("The mock community already marked this issue fixed. Choose an open issue.");
  const reporterOrdinal = issue.reporterIds.length + 1;
  const bonusXp = reportOrderBonus(reporterOrdinal);
  const next = DemoRepairStateSchema.parse({ ...current, additionalReporters: [...current.additionalReporters, { issueId, userId }] });
  return {
    state: next, issue: demoWorldIssues(next).find(candidate => candidate.id === issueId)!, duplicate: false,
    reporterOrdinal, bonusXp,
    message: `${user.displayName} is mock reporter #${reporterOrdinal}. +${bonusXp} early-report bonus XP. This simulation has not contacted a council.`,
  };
}

export function readDemoRepairs(storage: Pick<Storage, "getItem">): DemoRepairState {
  try {
    const raw = storage.getItem(DEMO_REPAIR_STORAGE_KEY);
    if (!raw || raw.length > MAX_STORAGE_CHARACTERS) return emptyDemoRepairs();
    const parsed = DemoRepairStateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptyDemoRepairs();
  } catch {
    return emptyDemoRepairs();
  }
}

export function saveDemoRepairs(storage: Pick<Storage, "setItem">, state: DemoRepairState): string | undefined {
  try {
    const data = JSON.stringify(DemoRepairStateSchema.parse(state));
    if (data.length > MAX_STORAGE_CHARACTERS) throw new Error("Demo storage limit exceeded.");
    storage.setItem(DEMO_REPAIR_STORAGE_KEY, data);
    return undefined;
  } catch {
    return "These mock confirmations could not be saved. They remain available for this visit.";
  }
}
