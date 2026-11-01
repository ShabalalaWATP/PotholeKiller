"use client";

import { ArrowRight, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import Creature from "@/components/game/Creature";
import { isCapturable, isCroissant } from "@/lib/ai/schema";
import { creatureForAnalysis, DEFECT_LABELS } from "@/lib/reporting/report";
import type { ScanResult } from "./ScanPanel";
import MonsterPower from "@/components/game/MonsterPower";
import { defaultMonsterProfile, monsterPower, type MonsterProfile } from "@/lib/game/power";

export default function Encounter({ result, monsterProfile = defaultMonsterProfile(), onContinue, onRetry }: { result: ScanResult; monsterProfile?: MonsterProfile; onContinue: () => void; onRetry: () => void }) {
  const valid = isCapturable(result.analysis);
  const croissant = isCroissant(result.analysis);
  const creature = creatureForAnalysis(result.analysis, result.imageHash);
  const now = new Date().toISOString();
  const power = monsterPower(monsterProfile, now);
  return <section className={`encounter ${!valid ? "rejected" : ""}`}>
    <span className={`source-badge ${result.source === "live" ? "live" : ""}`}><span /> {result.source === "live" ? "LIVE OPENAI VISION" : "PREDEFINED EXAMPLE OUTPUT"}</span>
    <p className="eyebrow">{valid ? "CRATER ALERT!" : croissant ? "NICE TRY, CRUMB LORD." : "HOLD YOUR TRAFFIC CONES."}</p>
    <div className="encounter-art"><div className="encounter-rays" /><Creature family={valid ? creature.family : "gremlin"} power={valid ? power.score : 1} mood={valid ? "grumpy" : "surprised"} />
      <span className="encounter-star star-one">✦</span><span className="encounter-star star-two">✦</span>
      {!valid && croissant && <span className="pastry" aria-hidden="true">🥐</span>}
    </div>
    <h2>{valid ? creature.name : croissant ? "An impressive pastry." : "No capture. No guesswork."}</h2>
    <p className="creature-quote">{valid ? `“${creature.description}”` : croissant ? "That’s a croissant, not a pothole. Delicious. Still 0 XP." : "We need a clear photograph of visible road damage before preparing a report."}</p>
    {valid && <div className="creature-meta"><span className={`rarity rarity-${creature.rarity.toLowerCase()}`}><Sparkles size={13} /> {creature.rarity}</span><span>{creature.family === "crackling" ? "Crackling" : "Crater Beast"}</span><span>Discovered</span></div>}
    {valid && <MonsterPower profile={monsterProfile} asOf={now} isDemo={result.isDemo} />}
    {valid && result.receiptUnavailable && <p className="notice">Community scoring is unavailable for this scan. You can still capture locally. Sign in and scan the photo again to obtain a scoring receipt.</p>}
    <div className="factual-findings"><Image src={result.preview} alt="Scanned photograph" width={400} height={300} unoptimized /><div><span className="eyebrow"><ShieldCheck size={14} /> WHAT THE PHOTO SHOWS</span><strong>{DEFECT_LABELS[result.analysis.defectType]}</strong><p>{result.analysis.factualDescription}</p></div></div>
    <p className="tiny muted">{valid ? "Rarity is cosmetic. It says nothing about road safety or damage severity." : "Uncertain images, shadows and unrelated objects earn no XP."}</p>
    <button className={`button full-width ${valid ? "button-yellow" : "button-light"}`} onClick={valid ? onContinue : onRetry}>
      {valid ? <>Capture & report <ArrowRight size={20} /></> : <><RotateCcw size={18} /> Try another photo <span className="zero-xp">0 XP</span></>}
    </button>
  </section>;
}
