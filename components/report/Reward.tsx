"use client";

import { useState } from "react";
import { ArrowUpRight, Check, CheckCircle2, Copy, Mail, RotateCcw, Trophy } from "lucide-react";
import Creature from "@/components/game/Creature";
import { buildMailto, reportingInstructions, reportStatusLabel } from "@/lib/reporting/handoff";
import type { ReportRecord, ReportStatus } from "@/lib/reporting/report";

export default function Reward({ report, awardedXp, onHunt, onStatus, saveError }: {
  report: ReportRecord; awardedXp: number; onHunt: () => void; onStatus: (status: ReportStatus) => void; saveError?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const mailto = buildMailto(report);
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
      <Creature family={report.creature.family} mood="happy" />
      <h3>{report.creature.name}</h3><p>“{report.creature.description}”</p><div className="card-bottom"><Check size={14} /> ADDED TO YOUR POTHOLEDEX</div>
    </div><div className="reward-details">
      <div className="xp-reward"><Trophy size={30} /><strong>+{awardedXp} <span>XP</span></strong></div>
      <p>{awardedXp ? "Useful evidence. Properly documented. Nicely done, hunter." : "Already in your collection. Each photograph earns XP once."}</p>
      <div className="report-status"><span className="status-dot" /> {reportStatusLabel(report)}</div>
      {report.isDemo ? <div className="notice">Fictional demo report. Copy it for the demonstration. Sending to a real council is disabled.</div> : <p className="tiny muted">You control the handoff. No council receipt or repair has been verified. Attach the original photo manually.</p>}
      <div className="report-actions"><button className="button button-yellow" onClick={() => void copy()}>{copied ? <Check size={18} /> : <Copy size={18} />} {copied ? "Report copied" : "Copy report"}</button>
        {mailto && <a className="button button-outline" href={mailto} onClick={() => { if (report.status === "draft_prepared") onStatus("email_handoff"); }}><Mail size={18} /> Prepare email</a>}
        <a className="official-link" href={reportingInstructions(report)} target="_blank" rel="noopener noreferrer">{report.authority === "hackney" ? "Official instructions" : "Find the right authority"} <ArrowUpRight size={16} /></a></div>
      {!report.isDemo && report.status !== "submitted_by_user" && <label className="check-label"><input type="checkbox" checked={false} onChange={event => { if (event.target.checked) onStatus("submitted_by_user"); }} /> I have submitted this report myself.</label>}
      {saveError && <p className="error-message" role="alert">{saveError}</p>}
    </div></div>
    <button className="text-button report-toggle" aria-expanded={showReport} onClick={() => setShowReport(!showReport)}>{showReport ? "Hide" : "Read"} the complete report <ArrowUpRight size={15} /></button>
    {copyError && <p className="error-message" role="alert">Clipboard unavailable. Select and copy the report below.</p>}
    {showReport && <textarea className="report-output" aria-label="Complete report draft" readOnly value={`${report.subject}\n\n${report.body}`} rows={14} onFocus={event => event.target.select()} />}
    <button className="button button-light full-width" onClick={onHunt}><RotateCcw size={18} /> Back to the hunt</button>
  </section>;
}
