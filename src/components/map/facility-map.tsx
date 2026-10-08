"use client";

import dynamic from "next/dynamic";
import type { LeafletMapProps } from "./leaflet-map";

/**
 * Leaflet needs `window`, so the map is loaded in the browser only; the
 * placeholder keeps the page from jumping while it loads.
 */
const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-surface text-sm text-muted">
      地図を読み込み中…
    </div>
  ),
});

export type { MapMarker } from "./leaflet-map";

export default function FacilityMap({ className, ...props }: LeafletMapProps) {
  return (
    <div className={`overflow-hidden border border-border ${className ?? ""}`}>
      <LeafletMap {...props} className="h-full w-full" />
    </div>
  );
}
