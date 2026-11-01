"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, ImageOverlay, Tooltip, useMap, useMapEvents, Circle } from "react-leaflet";
import L from "leaflet";
import { Layers, LocateFixed } from "lucide-react";

export type Location = { lat: number; lng: number };
const centre: L.LatLngExpression = [51.545, -0.059];
const bounds: L.LatLngBoundsExpression = [[51.530, -0.1025], [51.563, -0.0155]];
const markers = [
  { position: [51.5483, -0.0669], name: "Lord Potholious", sample: "pothole", colour: "mint", symbol: "●" },
  { position: [51.5425, -0.0519], name: "Count Crackula", sample: "crack", colour: "purple", symbol: "ϟ" },
  { position: [51.5364, -0.0661], name: "Baron von Bump", sample: "pothole", colour: "coral", symbol: "●" },
  { position: [51.554, -0.047], name: "Sir Cracksalot", sample: "crack", colour: "yellow", symbol: "ϟ" },
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
function Recentre({ location }: { location?: Location }) {
  const map = useMap();
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (button.current) L.DomEvent.disableClickPropagation(button.current); }, []);
  return <button ref={button} type="button" className="map-recentre icon-button" onClick={() => map.flyTo(location ? [location.lat, location.lng] : centre, 14)} aria-label="Recentre on selected pin"><LocateFixed size={20} /></button>;
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

export default function MapLeaflet({ mode = "hunt", schematic = false, location, onLocationChange, onHunt }: {
  mode?: "hunt" | "location"; schematic?: boolean; location?: Location; onLocationChange?: (location: Location) => void;
  onHunt?: (sample: "pothole" | "crack") => void;
}) {
  const [streets, setStreets] = useState(mode === "location" && !schematic);
  const [tileError, setTileError] = useState(false);
  const validLocation = location && Number.isFinite(location.lat) && Number.isFinite(location.lng)
    && Math.abs(location.lat) <= 90 && Math.abs(location.lng) <= 180 ? location : undefined;
  return <div className={`atlas ${mode === "location" ? "location-atlas" : ""}`}>
    <MapContainer center={validLocation ? [validLocation.lat, validLocation.lng] : centre} zoom={14} minZoom={mode === "hunt" && !streets ? 13 : 2}
      maxZoom={mode === "hunt" && !streets ? 16 : 19} scrollWheelZoom={false} zoomControl={true} attributionControl={true}>
      {streets ? <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        eventHandlers={{ tileerror: () => setTileError(true) }} /> :
        <ImageOverlay url="/map/hackney-pilot.svg" bounds={bounds} attribution="Original schematic · Fictional demo locations" />}
      {mode === "hunt" && markers.map((marker, index) => <Marker key={marker.name} title={`${marker.name}, fictional demonstration sample`}
        position={[marker.position[0], marker.position[1]]}
        icon={L.divIcon({ className: "monster-map-icon", html: `<span aria-hidden="true" class="marker-creature ${marker.colour}" style="animation-delay:${index * .3}s"><i></i><i></i><b>⌣</b></span>`, iconSize: [58, 64], iconAnchor: [29, 56] })}
        eventHandlers={{ click: () => onHunt?.(marker.sample) }}>
        <Tooltip direction="top" offset={[0, -50]}>{marker.name} · fictional demo</Tooltip>
      </Marker>)}
      {mode === "hunt" && <Circle center={centre} radius={270} pathOptions={{ color: "#7862bc", weight: 1.5, dashArray: "5 8", fillOpacity: .035 }} />}
      {mode === "hunt" && !streets && <FitHunt />}
      {validLocation && <Marker position={[validLocation.lat, validLocation.lng]} icon={pin} draggable eventHandlers={{ dragend: event => {
        const latLng = (event.target as L.Marker).getLatLng(); onLocationChange?.({ lat: +latLng.lat.toFixed(6), lng: +latLng.lng.toFixed(6) });
      }}} />}
      <Events onChange={mode === "location" ? onLocationChange : undefined} />
      <Reposition location={validLocation} /><Recentre location={validLocation} />
    </MapContainer>
    {mode === "hunt" && <button type="button" className="map-layer" onClick={() => { setStreets(!streets); setTileError(false); }}><Layers size={16} /> {streets ? "Game map" : "Street map"}</button>}
    {mode === "location" && schematic && <span className="demo-map-label">Fictional schematic</span>}
    {tileError && <div className="map-error" role="status">Street tiles unavailable. {mode === "location" ? "Enter verified coordinates below." : "Switch to the offline game map."}</div>}
  </div>;
}
