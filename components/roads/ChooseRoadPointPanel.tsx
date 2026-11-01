"use client";

import { useCallback, useState } from "react";
import { ArrowLeft, ArrowRight, MapPin, ShieldCheck } from "lucide-react";
import Atlas from "@/components/map/Atlas";
import LocationSearch from "@/components/report/LocationSearch";
import { LocationCandidateSchema, LocationInputSchema, type LocationCandidate } from "@/lib/location/schema";
import { PILOT_LOCATION } from "@/lib/pilot";
import type { RoadIssue } from "@/lib/roads/schema";

export type ChooseRoadPointPanelProps = {
  initialPlace?: LocationCandidate;
  initialIssue?: RoadIssue;
  onContinue: (place: LocationCandidate) => void;
  onCancel: () => void;
};

export function ChooseRoadPointPanel({ initialPlace, initialIssue, onContinue, onCancel }: ChooseRoadPointPanelProps) {
  const [location, setLocation] = useState(initialIssue?.location ?? initialPlace?.location ?? PILOT_LOCATION);
  const [selected, setSelected] = useState<LocationCandidate | undefined>(() => {
    if (!initialPlace || (initialIssue && (initialPlace.location.lat !== initialIssue.location.lat || initialPlace.location.lng !== initialIssue.location.lng))) return undefined;
    return initialPlace;
  });
  const [hasChosen, setHasChosen] = useState(!!initialIssue || !!initialPlace);
  const [confirmed, setConfirmed] = useState(false);
  const [pinRevision, setPinRevision] = useState(0);
  const [error, setError] = useState("");
  const validPin = LocationInputSchema.safeParse(location).success;

  const selectPlace = useCallback((place: LocationCandidate) => {
    setLocation(place.location); setSelected(place); setHasChosen(true); setConfirmed(false); setError("");
  }, []);

  function movePin(point: typeof location) {
    setLocation(point); setSelected(undefined); setHasChosen(true); setConfirmed(false); setError("");
    // Remounting cancels the old request and starts the search component's debounce.
    setPinRevision(previous => previous + 1);
  }

  function continueWithPin() {
    setError("");
    if (!hasChosen || !confirmed || !validPin) { setError("Choose the exact UK road pin and confirm it before continuing."); return; }
    const unchangedIssuePin = initialIssue && initialIssue.location.lat === location.lat && initialIssue.location.lng === location.lng;
    const place = LocationCandidateSchema.safeParse({
      id: selected?.id ?? `pin-${location.lat.toFixed(6)}-${location.lng.toFixed(6)}`,
      label: selected?.label ?? (unchangedIssuePin ? initialIssue.label : `Confirmed road pin: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`),
      location, postcode: selected?.postcode ?? null, country: selected?.country ?? null,
      accuracy: "pin", council: selected?.council ?? null,
      warnings: selected?.warnings ?? ["The road pin was confirmed manually. Verify the responsible highway authority before sending a report."],
    });
    if (!place.success) { setError("Check that the pin marks a valid UK road location."); return; }
    onContinue(place.data);
  }

  return <section className="choose-road-point">
    <button type="button" className="text-button back-button" onClick={onCancel}><ArrowLeft size={15} />Back to the map</button>
    <p className="eyebrow mint-text"><MapPin size={15} /> CHOOSE THE ROAD PIN</p>
    <h2>Where is<br /><span className="yellow-text">the road damage?</span></h2>
    <p className="choose-road-intro">Find the address, then put the pin on the exact defect before adding your photograph.</p>
    {initialIssue && <p className="notice">Adding a report to <strong>{initialIssue.label}</strong>. Check that this pin marks the same road issue.</p>}
    <form onSubmit={event => { event.preventDefault(); continueWithPin(); }}>
      <LocationSearch key={pinRevision} location={location} selected={selected} onSelect={selectPlace}
        autoLookupPin={validPin && (pinRevision > 0 || !!initialIssue || (!!initialPlace && !initialPlace.council))} />
      <p className="choose-road-map-help">Tap the street map or drag the pin. Your location is used only if you choose “Use my location”.</p>
      <Atlas mode="location" schematic={false} location={location} onLocationChange={movePin} />
      <div className="coordinate-fields"><label>Latitude<input aria-label="Road pin latitude" type="number" min={49.7} max={61.1} step="any" required value={Number.isFinite(location.lat) ? location.lat : ""} onChange={event => movePin({ ...location, lat: event.target.valueAsNumber })} /></label>
        <label>Longitude<input aria-label="Road pin longitude" type="number" min={-8.7} max={2.1} step="any" required value={Number.isFinite(location.lng) ? location.lng : ""} onChange={event => movePin({ ...location, lng: event.target.valueAsNumber })} /></label></div>
      <label className="check-label choose-road-confirm"><input type="checkbox" required checked={confirmed} disabled={!hasChosen || !validPin} onChange={event => setConfirmed(event.target.checked)} /><span>I have checked that this pin marks the actual road damage.</span></label>
      {error && <p className="error-message" role="alert">{error}</p>}
      <p className="choose-road-authority"><ShieldCheck size={15} /><span>{selected?.council ? `Suggested reporting authority: ${selected.council.name}. Verify it maintains this road.` : "You can continue with a confirmed pin if lookup is unavailable. The reporting authority must still be checked."}</span></p>
      <div className="choose-road-footer"><p>Your photograph will not supply<br />or silently change the road pin.</p><button type="submit" className="button button-yellow" disabled={!confirmed || !hasChosen || !validPin}>Continue to photo<ArrowRight size={17} /></button></div>
    </form>
  </section>;
}

export default ChooseRoadPointPanel;
