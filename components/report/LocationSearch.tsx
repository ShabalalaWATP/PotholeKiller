"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, Search } from "lucide-react";
import { findLocation } from "@/lib/client/location";
import type { LocationCandidate, LocationInput } from "@/lib/location/schema";

export default function LocationSearch({ location, selected, onSelect, autoLookupPin = false }: {
  location: { lat: number; lng: number }; selected?: LocationCandidate; onSelect: (candidate: LocationCandidate) => void;
  autoLookupPin?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [candidates, setCandidates] = useState<LocationCandidate[]>([]);
  const [attribution, setAttribution] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const active = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [initialPin] = useState(() => ({ location, autoLookupPin }));
  useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; active.current?.abort(); }; }, []);

  const lookup = useCallback(async (input: LocationInput) => {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30_000);
    setBusy(true); setError(""); setCandidates([]); setWarnings([]);
    try {
      const result = await findLocation(input, controller.signal);
      if (controller.signal.aborted || !mounted.current) return;
      setCandidates(result.candidates); setAttribution(result.attribution); setWarnings(result.warnings);
      if (result.candidates.length === 1) onSelect(result.candidates[0]);
      if (!result.candidates.length) setError("No matching UK location found. Try a street and postcode, or position the pin.");
    } catch (cause) {
      if (mounted.current && active.current === controller) setError(cause instanceof Error && cause.name !== "AbortError" ? cause.message : "Location lookup timed out. Try a postcode or confirm the pin manually.");
    } finally { clearTimeout(timeout); if (mounted.current && active.current === controller) setBusy(false); }
  }, [onSelect]);
  useEffect(() => {
    if (!initialPin.autoLookupPin || !Number.isFinite(initialPin.location.lat) || !Number.isFinite(initialPin.location.lng)) return;
    const timer = setTimeout(() => void lookup(initialPin.location), 700);
    return () => clearTimeout(timer);
  }, [initialPin, lookup]);
  function useLocation() {
    if (!navigator.geolocation) { setError("This browser does not provide location. Search by address instead."); return; }
    setBusy(true); setError("");
    navigator.geolocation.getCurrentPosition(position => {
      if (!mounted.current) return;
      void lookup({ lat: position.coords.latitude, lng: position.coords.longitude });
    }, () => { if (mounted.current) { setBusy(false); setError("Location access was unavailable. Search by address or postcode instead."); } },
    { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 });
  }
  return <div className="location-search">
    <label className="field-label" htmlFor="address-search">Find a UK address or postcode</label>
    <div className="address-search-row"><input id="address-search" maxLength={180} value={query} placeholder="Street and postcode, e.g. Mare Street E8 1EA" onChange={event => setQuery(event.target.value)} onKeyDown={event => {
      if (event.key === "Enter") { event.preventDefault(); if (query.trim().length >= 3 && !busy) void lookup({ query: query.trim() }); }
    }} /><button type="button" className="button button-yellow" disabled={busy || query.trim().length < 3} onClick={() => void lookup({ query: query.trim() })} aria-label="Find address"><Search size={17} /></button></div>
    <div className="location-shortcuts"><button type="button" className="text-button" disabled={busy} onClick={useLocation}><LocateFixed size={14} /> Use my location</button>
      <button type="button" className="text-button" disabled={busy || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)} onClick={() => void lookup(location)}><MapPin size={14} /> Find council for this pin</button></div>
    <p className="tiny muted">Searches send the entered address to location providers. Location permission is requested only if you choose “Use my location”. Always check the road pin.</p>
    {busy && <p className="lookup-status" role="status">Finding the location and reporting authority…</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {candidates.length > 1 && <div className="location-results" aria-label="Matching addresses">{candidates.map(candidate => <button type="button" key={candidate.id} onClick={() => onSelect(candidate)}>
      <MapPin size={15} /><span><strong>{candidate.label}</strong><small>{candidate.accuracy === "postcode" ? "Postcode area, position the exact road pin" : `${candidate.accuracy} match`} · {candidate.council?.name ?? "Authority not found"}</small></span>
    </button>)}</div>}
    {selected && <div className="selected-location"><strong><MapPin size={14} /> {selected.label}</strong><span>{selected.accuracy === "postcode" ? "Approximate postcode centre. Move the pin onto the actual defect." : "Check that the pin marks the actual road defect."}</span>
      <span>Reporting route: <b>{selected.council?.name ?? "Not identified"}</b></span>
      {selected.council && <a href={selected.council.sourceUrl} target="_blank" rel="noopener noreferrer">Official contact source</a>}
      {selected.warnings.map(warning => <p key={warning}>{warning}</p>)}
    </div>}
    {warnings.map(warning => <p className="tiny muted" key={warning}>{warning}</p>)}
    {attribution && <p className="location-attribution">{attribution}</p>}
  </div>;
}
