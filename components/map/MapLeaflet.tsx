"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, ImageOverlay, Tooltip, useMap, useMapEvents, Circle } from "react-leaflet";
import L from "leaflet";
import { Check, ChevronDown, Layers, LocateFixed, Map, Moon } from "lucide-react";
import { demoMonsters as markers, demoMonsterProfile } from "@/lib/game/demo-monsters";
import { monsterPower, type MonsterProfile } from "@/lib/game/power";

export type Location = { lat: number; lng: number };
export type MapStyle = "game" | "streets" | "night";
export type MapLeafletProps = {
  mode?: "hunt" | "location";
  schematic?: boolean;
  location?: Location;
  onLocationChange?: (location: Location) => void;
  onHunt?: (sample: "pothole" | "crack", profile: MonsterProfile) => void;
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
function Recentre({ location }: { location?: Location }) {
  const map = useMap();
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (button.current) L.DomEvent.disableClickPropagation(button.current); }, []);
  return <button ref={button} type="button" className="map-recentre icon-button" onClick={() => map.flyTo(location ? [location.lat, location.lng] : centre, 14)} aria-label={location ? "Recentre on selected pin" : "Recentre on pilot area"}><LocateFixed size={20} /></button>;
}
const pin = L.divIcon({ className: "location-pin", html: '<span aria-hidden="true">+</span>', iconSize: [36, 36], iconAnchor: [18, 18] });

function FitHunt() {
  const map = useMap();
  useEffect(() => {
    const phone = window.matchMedia("(max-width: 640px)");
    const fit = () => {
      if (phone.matches) map.fitBounds(markers.map(marker => [marker.position[0], marker.position[1]]), { padding: [45, 55], maxZoom: 14 });
      else map.setView(centre, 14);
    };
    fit(); phone.addEventListener("change", fit);
    return () => phone.removeEventListener("change", fit);
  }, [map]);
  return null;
}

function HuntMarkers({ onHunt }: Pick<MapLeafletProps, "onHunt">) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const scale = Math.max(.4, 1 - Math.max(0, zoom - 15) * .18);

  return <>{markers.map((marker, index) => {
    const profile = demoMonsterProfile(marker);
    const power = monsterPower(profile, new Date().toISOString());
    return <Marker key={marker.name} title={`${marker.name}, game power ${power.score}, ${marker.ageDays} days, fictional demonstration sample`}
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

function StyleChooser({ value, onChange }: { value: MapStyle; onChange: (value: MapStyle) => void }) {
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
      {mapStyles.map(({ id: style, label, description, Icon }) => <button key={style} type="button" aria-pressed={value === style} onClick={() => { onChange(style); close(); }}>
        <Icon size={18} /><span><strong>{label}</strong><small>{description}</small></span>{value === style && <Check size={16} />}
      </button>)}
    </div>}
  </div>;
}

export default function MapLeaflet({ mode = "hunt", schematic = false, location, onLocationChange, onHunt }: MapLeafletProps) {
  const [style, setStyle] = useState<MapStyle>(mode === "location" && !schematic ? "streets" : "game");
  const [tileError, setTileError] = useState(false);
  const [tileAttempt, setTileAttempt] = useState(0);
  const notice = useRef<HTMLDivElement>(null);
  const gameMap = style === "game";
  const viewOnly = mode === "location" && !schematic && gameMap;
  const validLocation = location && Number.isFinite(location.lat) && Number.isFinite(location.lng)
    && Math.abs(location.lat) <= 90 && Math.abs(location.lng) <= 180 ? location : undefined;
  const displayLocation = viewOnly ? undefined : validLocation;
  useEffect(() => {
    if (notice.current) L.DomEvent.disableClickPropagation(notice.current);
  }, [tileError, viewOnly]);

  function chooseStyle(next: MapStyle) {
    if ((next === "game") !== gameMap) setTileError(false);
    setStyle(next);
  }

  return <div className={`atlas atlas-style-${style} ${mode === "location" ? "location-atlas" : ""}`}>
    <MapContainer center={validLocation ? [validLocation.lat, validLocation.lng] : centre} zoom={14} minZoom={gameMap ? 13 : 2}
      maxZoom={19} scrollWheelZoom={false} zoomControl={true} attributionControl={true}>
      {!gameMap ? <TileLayer key={tileAttempt} url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxNativeZoom={19} maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        eventHandlers={{ tileerror: () => setTileError(true) }} /> :
        <ImageOverlay url="/map/hackney-pilot.svg" bounds={bounds} attribution="Original schematic · Fictional demo locations" />}
      {mode === "hunt" && <HuntMarkers onHunt={onHunt} />}
      {mode === "hunt" && <Circle center={centre} radius={270} pathOptions={{ color: "#7862bc", weight: 1.5, dashArray: "5 8", fillOpacity: .035 }} />}
      {mode === "hunt" && <FitHunt />}
      {displayLocation && <Marker position={[displayLocation.lat, displayLocation.lng]} icon={pin} draggable eventHandlers={{ dragend: event => {
        const latLng = (event.target as L.Marker).getLatLng(); onLocationChange?.({ lat: +latLng.lat.toFixed(6), lng: +latLng.lng.toFixed(6) });
      }}} />}
      <Events onChange={mode === "location" && !viewOnly ? onLocationChange : undefined} />
      <LayerPolicy gameMap={gameMap} />
      <Reposition location={displayLocation} /><Recentre location={displayLocation} />
    </MapContainer>
    <StyleChooser value={style} onChange={chooseStyle} />
    {gameMap && <span className="map-schematic-label">{viewOnly ? "View only · fictional schematic" : "Fictional schematic"}</span>}
    {!gameMap && schematic && <span className="map-schematic-label">Fictional demo location</span>}
    {(tileError || viewOnly) && <div ref={notice} className="map-layer-notice" role="status">
      <p>{viewOnly
        ? "This illustration cannot locate a real defect. Choose Streets or enter verified coordinates below."
        : `Map tiles unavailable. Your coordinates have not changed.${mode === "location" ? " You can enter verified coordinates below." : " The offline game map is available."}`}</p>
      <div>
        {viewOnly ? <button type="button" onClick={() => chooseStyle("streets")}>Use Streets</button> : <>
          <button type="button" onClick={() => { setTileError(false); setTileAttempt(attempt => attempt + 1); }}>Retry map</button>
          <button type="button" onClick={() => chooseStyle("game")}>{mode === "location" && !schematic ? "View schematic" : "Use offline game map"}</button>
        </>}
      </div>
    </div>}
  </div>;
}
