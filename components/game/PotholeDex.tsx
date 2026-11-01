"use client";

import { ArrowUpRight, BookOpen, Trophy } from "lucide-react";
import Creature from "./Creature";
import { achievements, type GameState } from "@/lib/game/progression";
import type { ReportRecord } from "@/lib/reporting/report";
import { monsterPower } from "@/lib/game/power";

const achievementNames = { first_blood: "First Blood", asphalt_avenger: "Asphalt Avenger", nice_try: "Nice Try" };
export default function PotholeDex({ state, onOpen, onHunt }: { state: GameState; onOpen: (record: ReportRecord) => void; onHunt: () => void }) {
  const unlocked = achievements(state);
  return <section className="dex-panel"><p className="eyebrow mint-text"><BookOpen size={16} /> YOUR POTHOLEDEX</p><h2>Local legends.<br /><span className="yellow-text">Literally.</span></h2>
    <p className="muted">{state.captures.length} creatures collected. Every card has a useful report behind it.</p>
    {unlocked.length > 0 && <div className="achievements">{unlocked.map(id => <span key={id}><Trophy size={15} /> {achievementNames[id]}</span>)}</div>}
    {state.captures.length ? <div className="dex-grid">{[...state.captures].reverse().map(record => <button className="dex-card" key={record.id} onClick={() => onOpen(record)}>
      <span className={`rarity rarity-${record.creature.rarity.toLowerCase()}`}>{record.creature.rarity}</span><Creature family={record.creature.family} power={monsterPower(record.monsterProfile, record.preparedAt).score} mood="happy" /><strong>{record.creature.name}</strong>
      <span className="dex-power">POWER {monsterPower(record.monsterProfile, record.preparedAt).score}/10 · {monsterPower(record.monsterProfile, record.preparedAt).captureXp} XP earned</span>
      <span>{new Date(record.preparedAt).toLocaleDateString("en-GB")} · {record.isDemo ? "Demo draft" : "Report draft"}</span><span className="dex-card-action">Open report <ArrowUpRight size={15} /></span>
    </button>)}</div> : <div className="empty-dex"><Creature family="gremlin" /><h3>A suspicious lack of monsters.</h3><p>Your first report unlocks your first creature.</p><button className="button button-yellow" onClick={onHunt}>Find your first rascal <ArrowUpRight size={18} /></button></div>}
    <p className="tiny muted">Saved in this browser only. Rarity is cosmetic, never a measure of road safety. Photographs are not stored.</p>
  </section>;
}
