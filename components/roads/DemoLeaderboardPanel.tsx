"use client";

import { ArrowUpRight, CheckCircle2, ShieldCheck, Trophy } from "lucide-react";
import Creature from "@/components/game/Creature";
import type { DemoWorldController } from "@/lib/client/useDemoWorld";

export type DemoLeaderboardPanelProps = {
  world: DemoWorldController;
  onOpenIssue?: (issueId: string) => void;
};

export function DemoLeaderboardPanel({ world, onOpenIssue }: DemoLeaderboardPanelProps) {
  const { counters } = world;
  return <section className="demo-leaderboard">
    <p className="eyebrow yellow-text"><Trophy size={16} /> MOCK LEADERBOARD</p>
    <h2>Meet the<br /><span className="yellow-text">fictional collectors.</span></h2>
    <p className="demo-board-intro">Explore a populated game world. All collectors, captures, scores and repair confirmations here are fictional.</p>
    <dl className="demo-world-stats">
      <div><dt>Mock reports</dt><dd>{counters.reportCount}</dd></div>
      <div><dt>Road issues</dt><dd>{counters.potholeCount}</dd></div>
      <div><dt>Collectors</dt><dd>{counters.userCount}</dd></div>
      <div><dt>Cleared</dt><dd>{counters.clearedCount}</dd></div>
    </dl>
    <div className="demo-board-heading"><span>FICTIONAL COLLECTOR</span><span>CAPTURES / XP</span></div>
    <ol className="demo-board-list">
      {world.leaderboard.map(entry => {
        const issueId = entry.issueIds.find(id => world.issues.some(issue => issue.id === id && issue.status === "open")) ?? entry.issueIds[0];
        return <li key={entry.id}>
          <span className={`demo-board-position ${entry.position === 1 ? "is-first" : ""}`}>{entry.position === 1 ? <Trophy size={17} aria-label="First place" /> : entry.position}</span>
          <Creature family={entry.avatar} mood="happy" title={`${entry.displayName}'s original creature avatar`} />
          <div className="demo-board-name"><strong>{entry.displayName}</strong><span>Level {entry.level} · {entry.rank}</span>{entry.councilVerified && <span className="demo-council-role"><ShieldCheck size={11} />Mock council account</span>}</div>
          <div className="demo-board-score"><strong>{entry.captures}</strong><span>{entry.xp.toLocaleString("en-GB")} XP</span></div>
          {onOpenIssue && issueId && <button type="button" className="icon-button" onClick={() => onOpenIssue(issueId)} aria-label={`View a mock road report by ${entry.displayName}`}><ArrowUpRight size={16} /></button>}
        </li>;
      })}
    </ol>
    {world.message && <p className="road-action-message" role="status">{world.message}</p>}
    <p className="demo-board-note"><CheckCircle2 size={16} /><span>Ranked by captured issues, then game XP. Five confirmation points clear a mock issue and double its original reporters’ capture XP and early-report bonus, once only. Real profiles and scores are separate.</span></p>
  </section>;
}

export default DemoLeaderboardPanel;
