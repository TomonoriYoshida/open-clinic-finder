"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

export type MapMarker = {
  id: number;
  latitude: number;
  longitude: number;
  /** Shown in the marker's popup. */
  title: string;
  detail?: string;
};

export type LeafletMapProps = {
  center: { latitude: number; longitude: number };
  zoom: number;
  markers: MapMarker[];
  /** Draws a circle of this many meters around the center (the search area). */
  radius?: number;
  /** Called after the user pans or zooms, with the new center. */
  onCenterChange?: (center: { latitude: number; longitude: number }) => void;
  onMarkerSelect?: (id: number) => void;
  /** Marker drawn larger and on top, e.g. the facility a page is about. */
  highlightedId?: number;
  className?: string;
};

/** 地理院タイル（淡色地図）: free to use with this credit, no API key. */
const tileUrl = "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png";
const tileAttribution =
  '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener noreferrer">地理院タイル</a>';

const teal = "#0f766e";

/**
 * A Leaflet map. Imports leaflet at module level, which touches `window`, so
 * pages load it through FacilityMap (next/dynamic with ssr: false).
 *
 * Markers are circle markers (vector), which avoids Leaflet's default icon
 * images that bundlers can't resolve. Popup content is built from DOM nodes
 * with textContent, since titles come from the API.
 */
export default function LeafletMap({
  center,
  zoom,
  markers,
  radius,
  onCenterChange,
  onMarkerSelect,
  highlightedId,
  className,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const fittedRadiusRef = useRef<number | undefined>(undefined);
  const drawnMarkersRef = useRef<string | null>(null);
  // Read inside Leaflet's event handlers, which are bound once.
  const callbacksRef = useRef({ onCenterChange, onMarkerSelect });

  useEffect(() => {
    callbacksRef.current = { onCenterChange, onMarkerSelect };
  });

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const map = L.map(containerRef.current, {
      center: [center.latitude, center.longitude],
      zoom,
      scrollWheelZoom: false,
    });
    // Zoom to the search area before any tiles exist. Doing it afterwards
    // (in the radius effect) changed the zoom while the first tiles were
    // loading, and some of them were left invisible until the next zoom.
    if (radius !== undefined) {
      map.fitBounds(L.latLng(center.latitude, center.longitude).toBounds(radius * 2), { animate: false });
      fittedRadiusRef.current = radius;
    }
    L.tileLayer(tileUrl, { attribution: tileAttribution, maxZoom: 18 }).addTo(map);
    // Follow the container's size (a rotated phone, the list toggled away).
    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    resizeObserver.observe(containerRef.current);
    map.attributionControl.setPrefix(
      '<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>',
    );
    markerLayerRef.current = L.layerGroup().addTo(map);
    // Opening a popup near the edge pans the map to fit it. That isn't the
    // visitor choosing a new place, and treating it as one would refetch and
    // redraw the markers, closing the popup that was just opened.
    let isAutoPanning = false;
    map.on("autopanstart", () => {
      isAutoPanning = true;
    });
    map.on("moveend", () => {
      if (isAutoPanning) {
        isAutoPanning = false;
        return;
      }
      const { lat, lng } = map.getCenter();
      callbacksRef.current.onCenterChange?.({ latitude: lat, longitude: lng });
    });
    mapRef.current = map;

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      // A new map (e.g. React's dev-mode remount) has nothing drawn yet, so
      // the "already drawn" checks below must not skip it.
      drawnMarkersRef.current = null;
      fittedRadiusRef.current = undefined;
    };
    // The map is created once; later center/zoom changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the center from outside (current location, back/forward), but not
  // the map's own panning echoing back through the URL.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const current = map.getCenter();
    if (
      Math.abs(current.lat - center.latitude) > 1e-5 ||
      Math.abs(current.lng - center.longitude) > 1e-5
    ) {
      map.setView([center.latitude, center.longitude], map.getZoom(), { animate: false });
    }
  }, [center.latitude, center.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    circleRef.current?.remove();
    circleRef.current =
      radius === undefined
        ? null
        : L.circle([center.latitude, center.longitude], {
            radius,
            color: teal,
            weight: 1.5,
            fillOpacity: 0.04,
            interactive: false,
          }).addTo(map);
    // Zoom to the whole search area when the radius changes (and at first),
    // not on every pan.
    if (circleRef.current && radius !== fittedRadiusRef.current) {
      map.fitBounds(circleRef.current.getBounds(), { animate: false });
      fittedRadiusRef.current = radius;
    }
  }, [center.latitude, center.longitude, radius]);

  useEffect(() => {
    const layer = markerLayerRef.current;
    if (!layer) {
      return;
    }
    // Redrawing closes any open popup, so only redraw when the markers changed
    // (not on every re-render or on a refetch with the same results).
    const drawn = JSON.stringify([markers, highlightedId]);
    if (drawn === drawnMarkersRef.current) {
      return;
    }
    drawnMarkersRef.current = drawn;
    layer.clearLayers();
    // The highlighted marker last, so it is drawn on top.
    const ordered = [...markers].sort(
      (a, b) => Number(a.id === highlightedId) - Number(b.id === highlightedId),
    );
    for (const marker of ordered) {
      const highlighted = marker.id === highlightedId;
      L.circleMarker([marker.latitude, marker.longitude], {
        radius: highlighted ? 9 : 6,
        color: "#ffffff",
        weight: 2,
        fillColor: highlighted ? "#b42318" : teal,
        fillOpacity: 0.9,
      })
        .bindPopup(() => popupContent(marker, callbacksRef.current.onMarkerSelect))
        .addTo(layer);
    }
  }, [markers, highlightedId]);

  return <div ref={containerRef} className={className} />;
}

function popupContent(marker: MapMarker, onSelect: ((id: number) => void) | undefined): HTMLElement {
  const container = document.createElement("div");
  const title = document.createElement("p");
  title.style.fontWeight = "700";
  title.style.margin = "0";
  title.textContent = marker.title;
  container.append(title);
  if (marker.detail) {
    const detail = document.createElement("p");
    detail.style.margin = "0.25rem 0 0";
    detail.textContent = marker.detail;
    container.append(detail);
  }
  if (onSelect) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "詳細を見る →";
    button.style.cssText = `margin-top:0.375rem;color:${teal};text-decoration:underline;cursor:pointer;background:none;border:0;padding:0;font:inherit`;
    button.addEventListener("click", () => onSelect(marker.id));
    container.append(button);
  }
  return container;
}
