"use client";

import dynamic from "next/dynamic";
import type { Location } from "./MapLeaflet";

const MapLeaflet = dynamic(() => import("./MapLeaflet"), {
  ssr: false,
  loading: () => <div className="map-loading"><span className="scanner-dot" /> Loading your patch…</div>,
});

export default function Atlas(props: { mode?: "hunt" | "location"; schematic?: boolean; location?: Location;
  onLocationChange?: (location: Location) => void; onHunt?: (sample: "pothole" | "crack") => void }) {
  return <MapLeaflet {...props} />;
}
