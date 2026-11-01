"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, ImageOverlay, Tooltip, useMap, useMapEvents, Circle } from "react-leaflet";
import L from "leaflet";
import { Check, ChevronDown, Layers, LocateFixed, Map, Moon } from "lucide-react";
import { demoMonsters as markers, demoMonsterProfile } from "@/lib/game/demo-monsters";
import { monsterPower, type MonsterProfile } from "@/lib/game/power";

export type Location = { lat: number; lng: number };
export type MapStyle = "game" | "streets" | "night";
export type MapIssue = {
  id: string;
  label: string;
  location: Location;
  type?: "cracking" | "small" | "medium" | "large";
  monsterProfile: MonsterProfile;
  createdAtISO: string;
  status: "open" | "community_fixed";
  isDemo?: boolean;
};
export type MapLeafletProps = {
  mode?: "hunt" | "location";
  schematic?: boolean;
  realWorld?: boolean;
  location?: Location;
  onLocationChange?: (location: Location) => void;
  onHunt?: (sample: "pothole" | "crack", profile: MonsterProfile) => void;
  issues?: readonly MapIssue[];
  onOpenIssue?: (id: string) => void;
  onNewIssue?: (location: Location) => void;
};

const centre: L.LatLngExpression = [51.545, -0.059];
const bounds: L.LatLngBoundsLiteral = [[51.530, -0.1025], [51.563, -0.0155]];
const mapStyles = [
  { id: "game", label: "Game map", description: "Fictional offline illustration", Icon: Layers },
  { id: "streets", label: "Streets", description: "OpenStreetMap geographic map", Icon: Map },
  { id: "night", label: "Night streets", description: "The same streets in darker colours", Icon: Moon },
] as const;

function Reposition({ location }: { location?: Location }) {
  const map = useMap();
  useEffect(() => {
    if (location && Number.isFinite(location.lat) && Number.isFinite(location.lng)
      && Math.abs(location.lat) <= 90 && Math.abs(location.lng) <= 180) map.panTo([location.lat, location.lng]);
  }, [location, map]);
  return null;
}
function Events({ onChange }: { onChange?: (location: Location) => void }) {
  useMapEvents({ click: event => onChange?.({ lat: +event.latlng.lat.toFixed(6), lng: +event.latlng.lng.toFixed(6) }) });
  return null;
}
function LayerPolicy({ gameMap }: { gameMap: boolean }) {
  const map = useMap();
  useEffect(() => {
    map.setMinZoom(gameMap ? 13 : 2);
    map.setMaxZoom(19);
    if (gameMap && !map.getBounds().intersects(L.latLngBounds(bounds))) map.setView(centre, 14);
  }, [gameMap, map]);
  return null;
}
function Recentre({ location, issues }: { location?: Location; issues?: readonly MapIssue[] }) {
  const map = useMap();
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (button.current) L.DomEvent.disableClickPropagation(button.current); }, []);
  function recentre() {
    const points: L.LatLngTuple[] = (issues ?? []).filter(issue => issue.status === "open" && validCoordinates(issue.location))
      .map(issue => [issue.location.lat, issue.location.lng]);
    if (!location && points.length) map.flyToBounds(points, { padding: [45, 55], maxZoom: 15 });
    else map.flyTo(location ? [location.lat, location.lng] : centre, 14);
  }
  return <button ref={button} type="button" className="map-recentre icon-button" onClick={recentre} aria-label={location ? "Recentre on selected pin" : issues ? "Show all mapped reports" : "Recentre on pilot area"}><LocateFixed size={20} /></button>;
}
const pin = L.divIcon({ className: "location-pin", html: '<span aria-hidden="true">+</span>', iconSize: [36, 36], iconAnchor: [18, 18] });

function FitHunt({ issues }: Pick<MapLeafletProps, "issues">) {
  const map = useMap();
  const initialPositions = useRef<L.LatLngTuple[] | null>(null);
  const hasIssues = issues !== undefined;
  useEffect(() => {
    // A new vote must never move the view away from the road being inspected.
    if (initialPositions.current) return;
    const positions: L.LatLngTuple[] = issues === undefined ? markers.map(marker => [...marker.position])
      : issues.filter(issue => validCoordinates(issue.location)).map(issue => [issue.location.lat, issue.location.lng]);
    if (!positions.length) return;
    initialPositions.current = positions;
    fitHuntView(map, positions, hasIssues);
  }, [map, issues, hasIssues]);
  useEffect(() => {
    const phone = window.matchMedia("(max-width: 640px)");
    const fit = () => { if (initialPositions.current) fitHuntView(map, initialPositions.current, hasIssues); };
    phone.addEventListener("change", fit);
    return () => phone.removeEventListener("change", fit);
  }, [map, hasIssues]);
  return null;
}

function fitHuntView(map: L.Map, positions: L.LatLngTuple[], hasIssues: boolean) {
  const phone = window.matchMedia("(max-width: 640px)").matches;
  if (hasIssues || phone) map.fitBounds(positions, { padding: phone ? [38, 55] : [60, 70], maxZoom: 15 });
  else map.setView(centre, 14);
}

function validCoordinates(location: Location) {
  return Number.isFinite(location.lat) && Number.isFinite(location.lng)
    && Math.abs(location.lat) <= 90 && Math.abs(location.lng) <= 180;
}

function mapMonsterProfile(issue: MapIssue): MonsterProfile {
  // Unknown defect age uses time recorded on the platform for game growth only.
  return { ...issue.monsterProfile, firstObservedOn: issue.monsterProfile.firstObservedOn ?? issue.createdAtISO.slice(0, 10) };
}

function IssueMarkers({ issues = [], onOpenIssue }: Pick<MapLeafletProps, "issues" | "onOpenIssue">) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const scale = Math.max(.4, 1 - Math.max(0, zoom - 15) * .18);
  const asOf = new Date().toISOString();
  const groups = new globalThis.Map<string, MapIssue[]>();
  for (const issue of issues) {
    if (issue.status !== "open" || !validCoordinates(issue.location)) continue;
    const point = map.project([issue.location.lat, issue.location.lng], zoom);
    const key = zoom >= 18 ? issue.id : `${Math.floor(point.x / 68)}:${Math.floor(point.y / 68)}`;
    const group = groups.get(key);
    if (group) group.push(issue); else groups.set(key, [issue]);
  }
  return <>{Array.from(groups, ([key, group]) => {
    if (group.length > 1) {
      const position: [number, number] = [group.reduce((sum, issue) => sum + issue.location.lat, 0) / group.length,
        group.reduce((sum, issue) => sum + issue.location.lng, 0) / group.length];
      const power = Math.max(...group.map(issue => monsterPower(mapMonsterProfile(issue), asOf).score));
      const source = group.every(issue => issue.isDemo) ? "demo issues"
        : group.some(issue => issue.isDemo) ? "demo and community issues" : "community issues";
      return <Marker key={`cluster-${key}`} position={position} bubblingMouseEvents={false} title={`${group.length} ${source}, highest game power ${power}. Zoom in to explore.`}
        icon={L.divIcon({ className: "issue-cluster-icon", iconSize: [58, 62], iconAnchor: [29, 31],
          html: `<span aria-hidden="true" class="issue-cluster-count">${group.length}</span><span aria-hidden="true" class="issue-cluster-power">P${power}</span>` })}
        eventHandlers={{ click: () => map.flyTo(position, Math.min(19, zoom + 2), { duration: .45 }) }}>
        <Tooltip>{group.length} {source}<br />Highest game power {power}/10<br />Select to zoom in and reveal each creature</Tooltip>
      </Marker>;
    }
    const issue = group[0];
    const power = monsterPower(mapMonsterProfile(issue), asOf);
    const family = issue.type ?? issue.monsterProfile.extent;
    const colour = family === "cracking" ? "purple" : family === "large" ? "coral" : family === "medium" ? "yellow" : "mint";
    const age = power.ageDays === null ? "AGE UNKNOWN"
      : issue.monsterProfile.firstObservedOn === null ? `${power.ageDays}D ON MAP` : `${power.ageDays} DAYS`;
    const source = issue.isDemo ? "fictional demo issue on a real road" : "community report";
    return <Marker key={issue.id} position={[issue.location.lat, issue.location.lng]} riseOnHover bubblingMouseEvents={false}
      title={`${issue.label}, game power ${power.score}, ${source}`}
      icon={L.divIcon({ className: `monster-map-icon precise-monster-icon map-power-${power.score >= 8 ? "boss" : power.score >= 4 ? "menace" : "rascal"}`,
        html: `<span aria-hidden="true" class="marker-tether"></span><span aria-hidden="true" class="marker-exact-point"></span><span aria-hidden="true" class="marker-visual" style="--marker-scale:${scale}"><span class="marker-creature ${colour} marker-family-${family}"><i></i><i></i><b>⌣</b><em class="map-power-badge">P${power.score}</em></span><span class="map-age">${age}</span></span>`,
        iconSize: [80, 92], iconAnchor: [40, 84] })}
      eventHandlers={{ click: () => onOpenIssue?.(issue.id) }}>
      <Tooltip direction="top" offset={[0, -(14 + 70 * scale)]}>{issue.label} · {power.tier}<br />Game power {power.score}/10 · {age.toLowerCase()}<br />{issue.isDemo ? "Demo issue, not a verified defect" : "Community report, unverified repair status"}<br />Dot marks the exact road coordinate</Tooltip>
    </Marker>;
  })}</>;
}

function HuntMarkers({ onHunt }: Pick<MapLeafletProps, "onHunt">) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const scale = Math.max(.4, 1 - Math.max(0, zoom - 15) * .18);

  return <>{markers.map((marker, index) => {
    const profile = demoMonsterProfile(marker);
    const power = monsterPower(profile, new Date().toISOString());
    return <Marker key={marker.name} bubblingMouseEvents={false} title={`${marker.name}, game power ${power.score}, ${marker.ageDays} days, fictional demonstration sample`}
      position={[marker.position[0], marker.position[1]]} riseOnHover
      icon={L.divIcon({
        className: `monster-map-icon precise-monster-icon map-power-${power.score >= 8 ? "boss" : power.score >= 4 ? "menace" : "rascal"}`,
        // The fixed anchor is the dot centre. Only the artwork scales; coordinates never move.
        html: `<span aria-hidden="true" class="marker-tether"></span><span aria-hidden="true" class="marker-exact-point"></span><span aria-hidden="true" class="marker-visual" style="--marker-scale:${scale}"><span class="marker-creature ${marker.colour}" style="animation-delay:${index * .3}s"><i></i><i></i><b>⌣</b><em class="map-power-badge">P${power.score}</em></span><span class="map-age">${marker.ageDays} DAYS</span></span>`,
        iconSize: [80, 92], iconAnchor: [40, 84],
      })}
      eventHandlers={{ click: () => onHunt?.(marker.sample, profile) }}>
      <Tooltip direction="top" offset={[0, -(14 + 70 * scale)]}>{marker.name} · {power.tier}<br />Game power {power.score}/10 · +{power.captureXp} XP<br />{marker.ageDays}-day fictional history<br />Dot marks the exact demo coordinate</Tooltip>
    </Marker>;
  })}</>;
}

function StyleChooser({ value, onChange, allowGame = true }: { value: MapStyle; onChange: (value: MapStyle) => void; allowGame?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = mapStyles.find(style => style.id === value)!;
  useEffect(() => {
    if (!wrapper.current) return;
    L.DomEvent.disableClickPropagation(wrapper.current);
    L.DomEvent.disableScrollPropagation(wrapper.current);
  }, []);

  function close() { setOpen(false); trigger.current?.focus(); }

  return <div ref={wrapper} className="map-style-control" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
  }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" className="map-style-trigger" aria-expanded={open} aria-controls={id} aria-label={`Map style: ${selected.label}`} onClick={() => setOpen(!open)}>
      <selected.Icon size={16} /><span>{selected.label}</span><ChevronDown size={14} />
    </button>
    {open && <div id={id} className="map-style-options" role="group" aria-label="Choose map style">
      {mapStyles.filter(style => allowGame || style.id !== "game").map(({ id: style, label, description, Icon }) => <button key={style} type="button" aria-pressed={value === style} onClick={() => { onChange(style); close(); }}>
        <Icon size={18} /><span><strong>{label}</strong><small>{description}</small></span>{value === style && <Check size={16} />}
      </button>)}
    </div>}
  </div>;
}

export default function MapLeaflet({ mode = "hunt", schematic = false, realWorld = false, location, onLocationChange, onHunt, issues, onOpenIssue, onNewIssue }: MapLeafletProps) {
  const geographicOnly = realWorld && mode === "hunt";
  const [style, setStyle] = useState<MapStyle>((mode === "location" && !schematic) || geographicOnly ? "streets" : "game");
  const [tileError, setTileError] = useState(false);
  const [tileAttempt, setTileAttempt] = useState(0);
  const notice = useRef<HTMLDivElement>(null);
  const activeStyle = geographicOnly && style === "game" ? "streets" : style;
  const gameMap = activeStyle === "game";
  const viewOnly = mode === "location" && !schematic && gameMap;
  const validLocation = location && Number.isFinite(location.lat) && Number.isFinite(location.lng)
    && Math.abs(location.lat) <= 90 && Math.abs(location.lng) <= 180 ? location : undefined;
  const displayLocation = viewOnly ? undefined : validLocation;
  useEffect(() => {
    if (notice.current) L.DomEvent.disableClickPropagation(notice.current);
  }, [tileError, viewOnly]);

  function chooseStyle(next: MapStyle) {
    if (geographicOnly && next === "game") return;
    if ((next === "game") !== gameMap) setTileError(false);
    setStyle(next);
  }

  return <div className={`atlas atlas-style-${activeStyle} ${mode === "location" ? "location-atlas" : ""}`}>
    <MapContainer center={validLocation ? [validLocation.lat, validLocation.lng] : centre} zoom={14} minZoom={gameMap ? 13 : 2}
      maxZoom={19} scrollWheelZoom={false} zoomControl={true} attributionControl={true}>
      {!gameMap ? <TileLayer key={tileAttempt} url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxNativeZoom={19} maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        eventHandlers={{ tileerror: () => setTileError(true) }} /> :
        <ImageOverlay url="/map/hackney-pilot.svg" bounds={bounds} attribution="Original schematic · Fictional demo locations" />}
      {mode === "hunt" && (issues === undefined ? <HuntMarkers onHunt={onHunt} /> : <IssueMarkers issues={issues} onOpenIssue={onOpenIssue} />)}
      {mode === "hunt" && !geographicOnly && <Circle center={centre} radius={270} pathOptions={{ color: "#7862bc", weight: 1.5, dashArray: "5 8", fillOpacity: .035 }} />}
      {mode === "hunt" && <FitHunt issues={issues} />}
      {displayLocation && <Marker position={[displayLocation.lat, displayLocation.lng]} icon={pin} draggable bubblingMouseEvents={false} eventHandlers={{ dragend: event => {
        const latLng = (event.target as L.Marker).getLatLng(); onLocationChange?.({ lat: +latLng.lat.toFixed(6), lng: +latLng.lng.toFixed(6) });
      }}} />}
      <Events onChange={mode === "location" && !viewOnly ? onLocationChange : mode === "hunt" && !gameMap ? onNewIssue : undefined} />
      <LayerPolicy gameMap={gameMap} />
      <Reposition location={displayLocation} /><Recentre location={displayLocation} issues={geographicOnly ? issues : undefined} />
    </MapContainer>
    <StyleChooser value={activeStyle} onChange={chooseStyle} allowGame={!geographicOnly} />
    {gameMap && <span className="map-schematic-label">{viewOnly ? "View only · fictional schematic" : "Fictional schematic"}</span>}
    {!gameMap && schematic && <span className="map-schematic-label">Fictional demo location</span>}
    {(tileError || viewOnly) && <div ref={notice} className="map-layer-notice" role="status">
      <p>{viewOnly
        ? "This illustration cannot locate a real defect. Choose Streets or enter verified coordinates below."
        : `Map tiles unavailable. Your coordinates have not changed.${mode === "location" ? " You can enter verified coordinates below." : geographicOnly ? " Report pins retain their recorded coordinates." : " The offline game map is available."}`}</p>
      <div>
        {viewOnly ? <button type="button" onClick={() => chooseStyle("streets")}>Use Streets</button> : <>
          <button type="button" onClick={() => { setTileError(false); setTileAttempt(attempt => attempt + 1); }}>Retry map</button>
          {!geographicOnly && <button type="button" onClick={() => chooseStyle("game")}>{mode === "location" && !schematic ? "View schematic" : "Use offline game map"}</button>}
        </>}
      </div>
    </div>}
  </div>;
}
