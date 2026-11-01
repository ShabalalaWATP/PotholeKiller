"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import Atlas from "@/components/map/Atlas";
import { PILOT_LOCATION } from "@/lib/pilot";
import { DEFECT_LABELS, prepareReport, type ReportRecord } from "@/lib/reporting/report";
import type { ScanResult } from "@/components/scan/ScanPanel";

export default function ReportPanel({ result, onPrepared, onBack }: { result: ScanResult; onPrepared: (report: ReportRecord) => void; onBack: () => void }) {
  const [description, setDescription] = useState(result.analysis.factualDescription);
  const [notes, setNotes] = useState("");
  const [landmark, setLandmark] = useState(result.isDemo ? "Fictional demonstration point, Hackney" : "");
  const [location, setLocation] = useState(PILOT_LOCATION);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [authority, setAuthority] = useState<"unknown" | "hackney">("unknown");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  function moveLocation(value: typeof location) { setLocation(value); setLocationConfirmed(false); }
  return <section className="report-panel">
    <button className="text-button back-button" onClick={onBack}><ArrowLeft size={15} /> Your encounter</button>
    <p className="eyebrow mint-text"><ShieldCheck size={15} /> MAKE THE CAPTURE COUNT</p>
    <h2>A little less game.<br /><span className="yellow-text">A lot more useful.</span></h2>
    <p className="muted">Check the evidence and pin the location. Drafts and defect coordinates are saved in this browser. Leave out names and contact details.</p>
    {result.isDemo && <div className="notice">DEMONSTRATION · This sample uses a fictional location. Email handoff is disabled.</div>}
    <form onSubmit={event => {
      event.preventDefault(); if (saving) return; setError("");
      try {
        if (!locationConfirmed || !reviewed) throw new Error("Confirm the location and review the findings before capturing.");
        const report = prepareReport({ analysis: result.analysis, description, notes, landmark, location,
          locationConfirmed: true, contentReviewed: true, authority, isDemo: result.isDemo, imageHash: result.imageHash });
        setSaving(true); onPrepared(report);
      } catch (cause) { setError(cause instanceof Error && !cause.message.startsWith("[") ? cause.message : "Check your description and valid map coordinates, then try again."); setSaving(false); }
    }}>
      <div className="report-grid"><div className="report-evidence">
        <span className="step-label"><b>01</b> REVIEW THE EVIDENCE</span>
        <div className="evidence-thumb"><Image src={result.preview} alt="Photograph used for this report" width={400} height={300} unoptimized /><div><strong>{DEFECT_LABELS[result.analysis.defectType]}</strong><span>{result.source === "live" ? "OpenAI visual assessment" : "Predefined example assessment"}</span></div></div>
        <label className="field-label" htmlFor="description">Visible damage, in your words</label>
        <textarea id="description" required minLength={10} maxLength={2000} rows={4} value={description} onChange={event => { setDescription(event.target.value); setReviewed(false); }} />
        <label className="field-label" htmlFor="landmark">Street or landmark <span>(optional)</span></label>
        <input id="landmark" maxLength={200} value={landmark} onChange={event => setLandmark(event.target.value)} placeholder="e.g. outside 12 Example Street" />
        <label className="field-label" htmlFor="notes">Anything else? <span>(optional)</span></label>
        <textarea id="notes" maxLength={1000} rows={2} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Your own observations, without guessing measurements" />
        <label className="check-label"><input type="checkbox" required checked={reviewed} onChange={event => setReviewed(event.target.checked)} /> I have reviewed and corrected the factual description.</label>
      </div><div className="report-location">
        <span className="step-label"><b>02</b> CONFIRM THE LOCATION</span>
        <p className="tiny muted">{result.isDemo ? "Use the example pin or tap the fictional demonstration map. These locations are examples only." : "Tap the street map, drag the pin, or enter verified coordinates. The photo never supplies your location."}</p>
        <Atlas mode="location" schematic={result.isDemo} location={location} onLocationChange={moveLocation} />
        <div className="coordinate-fields"><label>Latitude<input aria-label="Latitude" required type="number" min={-90} max={90} step="any" value={Number.isFinite(location.lat) ? location.lat : ""} onChange={event => moveLocation({ ...location, lat: event.target.valueAsNumber })} /></label>
          <label>Longitude<input aria-label="Longitude" required type="number" min={-180} max={180} step="any" value={Number.isFinite(location.lng) ? location.lng : ""} onChange={event => moveLocation({ ...location, lng: event.target.valueAsNumber })} /></label></div>
        <label className="check-label"><input type="checkbox" required checked={locationConfirmed} onChange={event => setLocationConfirmed(event.target.checked)} /> {result.isDemo ? "I confirm this fictional demonstration pin." : "I have checked that this pin marks the actual defect."}</label>
        <label className="field-label" htmlFor="authority">Reporting authority</label>
        <select id="authority" value={authority} onChange={event => setAuthority(event.target.value as typeof authority)}>
          <option value="unknown">Not confirmed / outside the pilot</option><option value="hackney">Hackney Council, selected by me</option>
        </select>
        <p className="tiny muted"><MapPin size={12} /> Some Hackney roads belong to TfL or private owners. Verify who maintains the road before sending.</p>
      </div></div>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="report-footer"><p>Preparing a draft documents the defect.<br />It doesn’t repair the road or submit a report.</p><button className="button button-yellow" disabled={saving}><Sparkles size={19} /> Prepare report & capture <span>+60 XP</span></button></div>
    </form>
  </section>;
}
