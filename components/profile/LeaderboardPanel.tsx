"use client";

import { ArrowRight, RefreshCw, ShieldCheck, Trophy, Users } from "lucide-react";
import Creature from "@/components/game/Creature";
import type { CollectorController } from "@/lib/client/useCollector";

export default function LeaderboardPanel({ collector, onOpenProfile }: { collector: CollectorController; onOpenProfile?: () => void }) {
  const entries = collector.snapshot?.leaderboard ?? [];
  const own = collector.auth.signedIn && collector.auth.snapshotLoaded ? collector.snapshot?.profile : null;

  return <section className="collector-leaderboard" aria-busy={collector.loading}>
    <p className="eyebrow mint-text"><Trophy size={16} /> THE STREET-SAVING SQUAD</p>
    <h2>Little creatures.<br /><span className="yellow-text">Real community effort.</span></h2>
    <div className="collector-board-intro"><p>Ranked by completed real captures.<br /><span>Every useful report is a small win for your streets.</span></p>
      <button type="button" className="icon-button" disabled={collector.loading} aria-label="Refresh community leaderboard" onClick={() => void collector.refresh()}><RefreshCw size={18} /></button>
    </div>
    {collector.error && <p className="error-message" role="alert">{collector.error}</p>}
    {own && <div className="collector-own-score"><ShieldCheck size={19} /><p><strong>Your community score: {own.captures} capture{own.captures === 1 ? "" : "s"} · {own.xp} XP</strong><span>{own.published ? "Your collector profile is public." : "Your profile is private. Publish it from your collector card to appear here."}</span></p></div>}
    {entries.length > 0 ? <>
      <div className="collector-board-heading"><span>COLLECTOR</span><span>CAPTURES</span></div>
      <ol className="collector-board-list">
        {entries.map(entry => <li key={entry.position}>
          <span className={`collector-position ${entry.position === 1 ? "collector-position-first" : ""}`}>{entry.position === 1 ? <Trophy size={18} aria-label="First place" /> : entry.position}</span>
          <Creature family={entry.avatar} mood="happy" title={`${entry.displayName}'s avatar`} />
          <div className="collector-entry-name"><strong>{entry.displayName}</strong><span>Level {entry.level} · {entry.rank}</span></div>
          <div className="collector-entry-score"><strong>{entry.captures}</strong><span>{entry.xp} XP</span></div>
        </li>)}
      </ol>
    </> : <div className="collector-board-empty">
      <div className="collector-empty-art"><Creature family="gremlin" mood="happy" /><Users size={30} /></div>
      <h3>{collector.loading ? "Finding the squad…" : collector.snapshot ? "First on the road?" : "The squad will be here soon."}</h3>
      <p>{collector.loading ? "Loading published collector scores." : collector.snapshot ? "No collectors have published a score yet. Sign in, prepare a real report and choose to join the board." : "The community board needs the hosted service. You can keep hunting and collecting on this device."}</p>
      {onOpenProfile && <button type="button" className="button button-yellow" onClick={onOpenProfile}>Your collector card<ArrowRight size={17} /></button>}
    </div>}
    <p className="collector-board-note"><ShieldCheck size={16} /><span>Only published profiles appear. Sample images, offline examples and repeated claims do not increase community scores. Report preparation does not verify council submission or road repair.</span></p>
  </section>;
}
