import { Flame } from "lucide-react";
import { monsterPower, type MonsterProfile } from "@/lib/game/power";

export default function MonsterPower({ profile, asOf, isDemo = false }: { profile: MonsterProfile; asOf: string; isDemo?: boolean }) {
  const power = monsterPower(profile, asOf);
  return <div className={`monster-power power-tier-${power.score >= 8 ? "boss" : power.score >= 4 ? "menace" : "rascal"}`}>
    <div className="power-score"><Flame size={20} /><strong>{power.score}<small>/10</small></strong><span>GAME POWER</span></div>
    <div><strong>{power.tier}</strong><span>{power.ageDays === null ? "Age unknown" : `${power.ageDays} days since first noticed`}{isDemo ? " · fictional history" : " · user supplied"}</span></div>
    <span className="power-xp">+{power.captureXp} XP <small>on capture</small></span>
  </div>;
}
