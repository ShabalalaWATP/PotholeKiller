"use client";

import { useSyncExternalStore } from "react";
import { demoIssues, demoUsers } from "../demo/data";
import { confirmDemoRepair, DEMO_REPAIR_STORAGE_KEY, demoLeaderboard, demoWorldIssues, emptyDemoRepairs, readDemoRepairs, reportDemoIssue, saveDemoRepairs, type DemoRepairState } from "../demo/repairs";

type Snapshot = { repairs: DemoRepairState; message: string | null };
const initial: Snapshot = { repairs: emptyDemoRepairs(), message: null };
let current: Snapshot | undefined;
const listeners = new Set<() => void>();

function getSnapshot(): Snapshot {
  if (!current) {
    try { current = { repairs: readDemoRepairs(window.localStorage), message: null }; }
    catch { current = { repairs: emptyDemoRepairs(), message: "Mock progress is available for this visit only." }; }
  }
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  function storageChanged(event: StorageEvent) {
    if (event.key === DEMO_REPAIR_STORAGE_KEY || event.key === null) {
      current = undefined;
      listeners.forEach(callback => callback());
    }
  }
  window.addEventListener("storage", storageChanged);
  return () => { listeners.delete(listener); window.removeEventListener("storage", storageChanged); };
}

export function useDemoWorld() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => initial);
  return {
    issues: demoWorldIssues(snapshot.repairs),
    users: demoUsers,
    leaderboard: demoLeaderboard(snapshot.repairs),
    counters: {
      reportCount: demoIssues.reduce((total, issue) => total + issue.reporterIds.length, 0) + snapshot.repairs.additionalReporters.length,
      potholeCount: demoIssues.length,
      userCount: demoUsers.length,
      clearedCount: snapshot.repairs.clearedIssueIds.length,
    },
    message: snapshot.message,
    report(issueId: string, mockUserId: string) {
      const result = reportDemoIssue(getSnapshot().repairs, issueId, mockUserId);
      let saveError: string | undefined;
      try { saveError = saveDemoRepairs(window.localStorage, result.state); }
      catch { saveError = "Mock progress is available for this visit only."; }
      current = { repairs: result.state, message: saveError ? `${result.message} ${saveError}` : result.message };
      listeners.forEach(listener => listener());
      return { ...result, saveError };
    },
    vote(issueId: string, mockUserId: string) {
      const result = confirmDemoRepair(getSnapshot().repairs, issueId, mockUserId);
      let saveError: string | undefined;
      try { saveError = saveDemoRepairs(window.localStorage, result.state); }
      catch { saveError = "Mock progress is available for this visit only."; }
      current = { repairs: result.state, message: saveError ? `${result.message} ${saveError}` : result.message };
      listeners.forEach(listener => listener());
      return { ...result, saveError };
    },
  };
}

export type DemoWorldController = ReturnType<typeof useDemoWorld>;
export default useDemoWorld;
