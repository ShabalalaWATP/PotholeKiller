"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { ArrowLeft, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import Atlas from "@/components/map/Atlas";
import { PILOT_LOCATION } from "@/lib/pilot";
import { DEFECT_LABELS, prepareReport, type ReportRecord } from "@/lib/reporting/report";
import type { ScanResult } from "@/components/scan/ScanPanel";
import MonsterProfileFields, { type ReportTypeChoice } from "./MonsterProfileFields";
import { defaultMonsterProfile, monsterPower, MonsterProfileSchema, type MonsterProfile } from "@/lib/game/power";
import LocationSearch from "./LocationSearch";
import type { LocationCandidate } from "@/lib/location/schema";
import type { RoadIssue } from "@/lib/roads/schema";

export default function ReportPanel({ result, initialProfile, initialPlace, initialIssue, initialReporterName = "", collectorSignedIn = false, onPrepared, onBack }: { result: ScanResult; initialProfile?: MonsterProfile; initialPlace?: LocationCandidate; initialIssue?: RoadIssue; initialReporterName?: string; collectorSignedIn?: boolean; onPrepared: (report: ReportRecord) => void; onBack: () => void }) {
  const [description, setDescription] = useState(result.analysis.factualDescription);
  const [reporterName, setReporterName] = useState(initialReporterName);
  const [notes, setNotes] = useState("");
  const [landmark, setLandmark] = useState(initialPlace?.label.slice(0, 200) ?? initialIssue?.label ?? (result.isDemo ? "Fictional demonstration point, Hackney" : ""));
  const [location, setLocation] = useState(initialPlace?.location ?? initialIssue?.location ?? PILOT_LOCATION);
  const [locationConfirmed, setLocationConfirmed] = useState(!!initialPlace && !result.isDemo);
  const [reviewed, setReviewed] = useState(false);
  const [authority, setAuthority] = useState<"unknown" | "hackney">("unknown");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [monsterProfile, setMonsterProfile] = useState(() => ({ ...(initialProfile ?? defaultMonsterProfile()), ...(result.analysis.defectType === "surface_crack" ? { extent: "unknown" as const } : {}) }));
  const [reportType, setReportType] = useState<ReportTypeChoice>(result.analysis.defectType === "surface_crack" ? "cracking" : initialProfile?.extent === "unknown" || !initialProfile ? "as_assessed" : initialProfile.extent);
  const [selectedLocation, setSelectedLocation] = useState<LocationCandidate | undefined>(initialPlace);
  const [pinRevision, setPinRevision] = useState(0);
  const [publishToMap, setPublishToMap] = useState(!!initialIssue && !result.isDemo && collectorSignedIn);
  const canPublish = collectorSignedIn && !result.isDemo && !!result.receiptId;
  const now = new Date().toISOString();
  const validatedProfile = MonsterProfileSchema.safeParse(monsterProfile);
  const power = validatedProfile.success && (!validatedProfile.data.firstObservedOn || validatedProfile.data.firstObservedOn <= now.slice(0, 10))
    ? monsterPower(validatedProfile.data, now) : undefined;
  function moveLocation(value: typeof location) {
    setLocation(value); setLocationConfirmed(false); setSelectedLocation(undefined); setAuthority("unknown"); setPinRevision(revision => revision + 1);
    if (selectedLocation && landmark === selectedLocation.label.slice(0, 200)) setLandmark("");
  }
  const selectLocation = useCallback((value: LocationCandidate) => {
    setLocation(value.location); setLandmark(value.label.slice(0, 200)); setSelectedLocation(value); setLocationConfirmed(false); setAuthority("unknown");
  }, []);
  function selectType(value: ReportTypeChoice) {
    setReportType(value); setReviewed(false);
    setMonsterProfile({ ...monsterProfile, extent: value === "cracking" || value === "as_assessed" ? "unknown" : value });
  }
  return <section className="report-panel">
    <button className="text-button back-button" onClick={onBack}><ArrowLeft size={15} /> Your encounter</button>
    <p className="eyebrow mint-text"><ShieldCheck size={15} /> MAKE THE CAPTURE COUNT</p>
    <h2>A little less game.<br /><span className="yellow-text">A lot more useful.</span></h2>
    <p className="muted">Your draft is written from the photo. Find the address to fill the location and reporting route, then review and capture.</p>
    {result.isDemo && <div className="notice">DEMONSTRATION · This sample uses a fictional location. Email handoff is disabled.</div>}
    <form onSubmit={event => {
      event.preventDefault(); if (saving) return; setError("");
      try {
        if (!locationConfirmed || !reviewed) throw new Error("Confirm the location and review the findings before capturing.");
        const analysis = { ...result.analysis, defectType: reportType === "as_assessed" ? result.analysis.defectType : reportType === "cracking" ? "surface_crack" as const : "pothole" as const };
        const report = prepareReport({ analysis, description, notes, reporterName, landmark, location,
          locationConfirmed: true, contentReviewed: true, authority, isDemo: result.isDemo, imageHash: result.imageHash, monsterProfile, councilContact: selectedLocation?.council ?? undefined, scanReceiptId: result.receiptId,
          publishToMap: canPublish && publishToMap, communityIssueId: !result.isDemo ? initialIssue?.id : undefined });
        setSaving(true); onPrepared(report);
      } catch (cause) { setError(cause instanceof Error && !cause.message.startsWith("[") ? cause.message : "Check your description and valid map coordinates, then try again."); setSaving(false); }
    }}>
      <div className="report-grid"><div className="report-evidence">
        <span className="step-label"><b>01</b> REVIEW THE EVIDENCE</span>
        <div className="evidence-thumb"><Image src={result.preview} alt="Photograph used for this report" width={400} height={300} unoptimized /><div><strong>{DEFECT_LABELS[result.analysis.defectType]}</strong><span>{result.source === "live" ? "OpenAI visual assessment" : "Predefined example assessment"}</span></div></div>
        <label className="field-label" htmlFor="reporter-name">Your name, for the council report</label>
        <input id="reporter-name" required minLength={2} maxLength={80} autoComplete="name" value={reporterName} onChange={event => setReporterName(event.target.value)} placeholder="Name to include in the council draft" />
        <p className="tiny muted">Prefilled from your collector profile. Edit it to the name you want the council to receive.</p>
        <label className="field-label" htmlFor="description">Visible damage, in your words</label>
        <textarea id="description" required minLength={10} maxLength={2000} rows={4} value={description} onChange={event => { setDescription(event.target.value); setReviewed(false); }} />
        <label className="field-label" htmlFor="landmark">Street or landmark <span>(optional)</span></label>
        <input id="landmark" maxLength={200} value={landmark} onChange={event => setLandmark(event.target.value)} placeholder="e.g. outside 12 Example Street" />
        <label className="field-label" htmlFor="notes">Anything else? <span>(optional)</span></label>
        <textarea id="notes" maxLength={1000} rows={2} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Your own observations, without guessing measurements" />
        <MonsterProfileFields profile={monsterProfile} onChange={value => { setMonsterProfile(value); setReviewed(false); }} isDemo={result.isDemo} reportType={reportType} onTypeChange={selectType} />
        <label className="check-label"><input type="checkbox" required checked={reviewed} onChange={event => setReviewed(event.target.checked)} /> I have reviewed and corrected the factual description.</label>
      </div><div className="report-location">
        <span className="step-label"><b>02</b> CONFIRM THE LOCATION</span>
        <LocationSearch key={pinRevision} autoLookupPin={pinRevision > 0 || (!initialPlace && !!initialIssue) || (!!initialPlace && !initialPlace.council)} location={location} selected={selectedLocation} onSelect={selectLocation} />
        <p className="tiny muted">{result.isDemo ? "Use the example pin or tap the fictional demonstration map. These locations are examples only." : "Tap the street map, drag the pin, or enter verified coordinates. The photo never supplies your location."}</p>
        <Atlas mode="location" schematic={result.isDemo} location={location} onLocationChange={moveLocation} />
        <div className="coordinate-fields"><label>Latitude<input aria-label="Latitude" required type="number" min={-90} max={90} step="any" value={Number.isFinite(location.lat) ? location.lat : ""} onChange={event => moveLocation({ ...location, lat: event.target.valueAsNumber })} /></label>
          <label>Longitude<input aria-label="Longitude" required type="number" min={-180} max={180} step="any" value={Number.isFinite(location.lng) ? location.lng : ""} onChange={event => moveLocation({ ...location, lng: event.target.valueAsNumber })} /></label></div>
        <label className="check-label"><input type="checkbox" required checked={locationConfirmed} onChange={event => setLocationConfirmed(event.target.checked)} /> {result.isDemo ? "I confirm this fictional demonstration pin." : "I have checked that this pin marks the actual defect."}</label>
        {selectedLocation?.council ? <div className="auto-council"><ShieldCheck size={17} /><div><strong>{selectedLocation.council.name}</strong><span>Reporting route selected from the location.</span><span>{selectedLocation.council.email ? `Email draft addressed to ${selectedLocation.council.email}` : "Official reporting route found. No direct reporting email has been verified."}</span></div></div> : <><label className="field-label" htmlFor="authority">Reporting authority <span>(if lookup is unavailable)</span></label>
        <select id="authority" value={authority} onChange={event => setAuthority(event.target.value as typeof authority)}>
          <option value="unknown">Not confirmed / outside the pilot</option><option value="hackney">Hackney Council, selected by me</option>
        </select></>}
        <p className="tiny muted"><MapPin size={12} /> Trunk roads, some London roads and private roads may have a different owner. Verify the responsible highway authority.</p>
      </div></div>
      {error && <p className="error-message" role="alert">{error}</p>}
      <p className="tiny muted">Your name and complete draft stay in this browser until you hand the report to the council. The public map receives only the road pin and street label. Keep personal details out of the street label.</p>
      {canPublish && <label className="check-label public-pin-consent"><input type="checkbox" checked={publishToMap} onChange={event => setPublishToMap(event.target.checked)} /><span>Publish this road pin and street label on the community map, and link my capture to repair confirmations. My photo and complete report stay private.</span></label>}
      <div className="report-footer"><p>Preparing a draft documents the defect.<br />It doesn’t repair the road or submit a report.</p><button className="button button-yellow" disabled={saving || !power}><Sparkles size={19} /> Prepare report & capture <span>+{power?.captureXp ?? 60} XP</span></button></div>
    </form>
  </section>;
}
