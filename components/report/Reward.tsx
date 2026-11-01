"use client";

import { useState } from "react";
import { ArrowUpRight, Check, CheckCircle2, Copy, Mail, RotateCcw, Trophy } from "lucide-react";
import Creature from "@/components/game/Creature";
import { buildMailto, reportingInstructions, reportStatusLabel } from "@/lib/reporting/handoff";
import type { ReportRecord, ReportStatus } from "@/lib/reporting/report";
import MonsterPower from "@/components/game/MonsterPower";
import { monsterPower } from "@/lib/game/power";

export default function Reward({ report, awardedXp, onHunt, onStatus, saveError, communityNotice, onShare, shareError, shared = false, reportBonus }: {
  report: ReportRecord; awardedXp: number; onHunt: () => void; onStatus: (status: ReportStatus) => void; saveError?: string; communityNotice?: string;
  onShare?: () => Promise<unknown>; shareError?: string | null; shared?: boolean;
  reportBonus?: { xp: number; ordinal: number };
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const mailto = buildMailto(report);
  const power = monsterPower(report.monsterProfile, report.preparedAt);
  async function copy() {
    try { await navigator.clipboard.writeText(`${report.subject}\n\n${report.body}`); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); setShowReport(true); }
  }
  return <section className="reward">
    {awardedXp > 0 && <div className="confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}</div>}
    <p className="eyebrow mint-text"><CheckCircle2 size={16} /> {awardedXp ? "POTHOLE CAPTURED!" : "YOUR FIELD REPORT"}</p>
    <h2>{awardedXp ? <>One less mystery.<br /><span className="yellow-text">One more monster.</span></> : report.creature.name}</h2>
    <div className="reward-layout"><div className="collectable-card">
      <div className="card-top"><span>No. {report.imageHash.slice(0, 3).toUpperCase()}</span><span className={`rarity rarity-${report.creature.rarity.toLowerCase()}`}>{report.creature.rarity}</span></div>
      <Creature family={report.creature.family} power={power.score} mood="happy" />
      <h3>{report.creature.name}</h3><p>“{report.creature.description}”</p><div className="card-bottom"><Check size={14} /> ADDED TO YOUR POTHOLEDEX</div>
    </div><div className="reward-details">
      <div className="xp-reward"><Trophy size={30} /><strong>+{awardedXp} <span>XP</span></strong></div>
      {reportBonus && <p className="notice" role="status">{reportBonus.xp > 0 ? `+${reportBonus.xp} community XP as reporter #${reportBonus.ordinal}.` : `Already counted as reporter #${reportBonus.ordinal}. No repeat reporting bonus.`}</p>}
      <MonsterPower profile={report.monsterProfile} asOf={report.preparedAt} isDemo={report.isDemo} />
      {awardedXp > 0 && power.bonusXp > 0 && <p className="tiny muted">60 report XP + {power.sizeBonus} extent XP + {power.ageBonus} age XP. Award fixed at capture.</p>}
      <p>{awardedXp ? "Useful evidence. Properly documented. Nicely done, hunter." : "Already in your collection. Each photograph earns XP once."}</p>
      <div className="report-status"><span className="status-dot" /> {reportStatusLabel(report)}</div>
      {report.isDemo ? <div className="notice">Fictional demo report. Copy it for the demonstration. Sending to a real council is disabled.</div> : <p className="tiny muted">You control the handoff. No council receipt or repair has been verified. Attach the original photo manually.</p>}
      <div className="report-actions"><button className="button button-yellow" onClick={() => void copy()}>{copied ? <Check size={18} /> : <Copy size={18} />} {copied ? "Report copied" : "Copy report"}</button>
        {mailto && <a className="button button-outline" href={mailto} onClick={() => { if (report.status === "draft_prepared") onStatus("email_handoff"); }}><Mail size={18} /> Prepare email</a>}
        <a className="official-link" href={reportingInstructions(report)} target="_blank" rel="noopener noreferrer">{report.councilContact ? `Report to ${report.councilContact.name}` : report.authority === "hackney" ? "Official instructions" : "Find the right authority"} <ArrowUpRight size={16} /></a></div>
      {report.councilContact && !report.councilContact.email && !report.isDemo && <p className="tiny muted">This authority’s official reporting route is linked above. Copy your prepared draft into its form. No direct email address has been verified.</p>}
      {!report.isDemo && report.status !== "submitted_by_user" && <label className="check-label"><input type="checkbox" checked={false} onChange={event => { if (event.target.checked) onStatus("submitted_by_user"); }} /> I have submitted this report myself.</label>}
      {saveError && <p className="error-message" role="alert">{saveError}</p>}
      {communityNotice && <p className="notice" role="status">{communityNotice}</p>}
      {report.publishToMap && !report.isDemo && <div className="community-pin-result"><p className="tiny muted">{shared ? "Road pin shared. Your capture XP and reporting bonus are awarded again when the repair threshold is reached." : "Public road-pin sharing was selected. If the update is pending, you can retry after saving your collector profile."}</p>
        {!shared && onShare && <button type="button" className="text-button" onClick={() => void onShare()}>Retry community map update <ArrowUpRight size={15} /></button>}
        {shareError && <p className="error-message" role="alert">{shareError}</p>}
      </div>}
    </div></div>
    <button className="text-button report-toggle" aria-expanded={showReport} onClick={() => setShowReport(!showReport)}>{showReport ? "Hide" : "Read"} the complete report <ArrowUpRight size={15} /></button>
    {copyError && <p className="error-message" role="alert">Clipboard unavailable. Select and copy the report below.</p>}
    {showReport && <textarea className="report-output" aria-label="Complete report draft" readOnly value={`${report.subject}\n\n${report.body}`} rows={14} onFocus={event => event.target.select()} />}
    <button className="button button-light full-width" onClick={onHunt}><RotateCcw size={18} /> Back to the hunt</button>
  </section>;
}
