"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoadIssue } from "@/lib/roads/schema";
import type { ReportRecord } from "@/lib/reporting/report";
import { confirmRoadIssueFixed, loadRoadIssues, publishRoadIssue, RoadServiceError } from "./roads";

export default function useRoadIssues(enabled = true) {
  const [issues, setIssues] = useState<RoadIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);
  const generation = useRef(0);
  const pending = useRef(0);

  const begin = useCallback(() => {
    pending.current += 1;
    if (active.current) { setLoading(true); setError(null); }
  }, []);
  const finish = useCallback(() => {
    pending.current = Math.max(0, pending.current - 1);
    if (active.current) setLoading(pending.current > 0);
  }, []);
  const recordError = useCallback((cause: unknown) => {
    if (active.current) setError(cause instanceof RoadServiceError ? cause.message : "The road service is unavailable. Please try again.");
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const ticket = ++generation.current;
    begin();
    try {
      const result = await loadRoadIssues();
      if (active.current && ticket === generation.current) setIssues(result);
    } catch (cause) { if (ticket === generation.current) recordError(cause); }
    finally { finish(); }
  }, [enabled, begin, finish, recordError]);

  useEffect(() => {
    active.current = true;
    void refresh();
    return () => { active.current = false; generation.current += 1; };
  }, [refresh]);

  const accept = useCallback((issue: RoadIssue) => {
    // Invalidate reads started before this server-confirmed update.
    generation.current += 1;
    if (!active.current) return;
    setIssues(previous => [issue, ...previous.filter(item => item.id !== issue.id)].slice(0, 200));
  }, []);

  const publish = useCallback(async (report: ReportRecord, existingIssueId?: string) => {
    begin();
    try { const result = await publishRoadIssue(report, existingIssueId); accept(result.issue); return result; }
    catch (cause) { recordError(cause); throw cause; }
    finally { finish(); }
  }, [accept, begin, finish, recordError]);

  const confirmFixed = useCallback(async (issueId: string) => {
    begin();
    try { const result = await confirmRoadIssueFixed(issueId); accept(result.issue); return result; }
    catch (cause) { recordError(cause); throw cause; }
    finally { finish(); }
  }, [accept, begin, finish, recordError]);

  return { issues, loading, error, refresh, publish, confirmFixed };
}

export { useRoadIssues };
export type RoadIssuesController = ReturnType<typeof useRoadIssues>;
