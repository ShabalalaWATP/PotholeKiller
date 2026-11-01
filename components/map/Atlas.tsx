"use client";

import dynamic from "next/dynamic";
import type { MapLeafletProps } from "./MapLeaflet";
export type { MapIssue, MapLeafletProps } from "./MapLeaflet";

const MapLeaflet = dynamic(() => import("./MapLeaflet"), {
  ssr: false,
  loading: () => <div className="map-loading"><span className="scanner-dot" /> Loading your patch…</div>,
});

export default function Atlas(props: MapLeafletProps) {
  return <MapLeaflet {...props} />;
}
