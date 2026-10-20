"use client";
import { useEffect, useRef, useState } from "react";
import type { Point, Station } from "./lib/stations";
import OpenStationMap from "./open-station-map";
import type { RoadRoute } from "./lib/road-route";
type Coord = { lat: number; lng: number };
type MapInstance = {
  fitBounds: (bounds: Bounds, padding: number) => void;
  panTo: (point: Coord) => void;
  setZoom: (zoom: number) => void;
};
type Bounds = { extend: (point: Coord) => void };
type Marker = {
  map: MapInstance | null;
  addListener: (name: string, callback: () => void) => { remove: () => void };
};
type MapsApi = {
  Polyline: new (options: Record<string, unknown>) => {
    setMap: (map: MapInstance | null) => void;
  };
  Map: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => MapInstance;
  LatLngBounds: new () => Bounds;
  marker: {
    AdvancedMarkerElement: new (options: Record<string, unknown>) => Marker;
  };
};
declare global {
  interface Window {
    google?: { maps: MapsApi };
    cnMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}
let sdk: Promise<MapsApi> | undefined;
function mapsSdk(key: string) {
  if (window.google?.maps.marker) return Promise.resolve(window.google.maps);
  if (!sdk)
    sdk = new Promise<MapsApi>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(Error("Map loading timed out")),
        15000,
      );
      window.cnMapsReady = () => {
        clearTimeout(timeout);
        if (window.google?.maps.marker) resolve(window.google.maps);
        else reject(Error("Map libraries unavailable"));
      };
      window.gm_authFailure = () => {
        clearTimeout(timeout);
        reject(Error("Google map authorization failed"));
      };
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=maps,marker&loading=async&callback=cnMapsReady&v=weekly`;
      script.onerror = () => {
        clearTimeout(timeout);
        sdk = undefined;
        reject(Error("Map could not load"));
      };
      document.head.appendChild(script);
    });
  return sdk;
}
export default function StationMap({
  stations,
  position,
  selected,
  onSelect,
  focusYou = false,
  onMode,
  onProvider,
  roadRoute,
}: {
  stations: Station[];
  position: Point | null;
  selected: Station | null;
  onSelect: (station: Station) => void;
  focusYou?: boolean;
  onMode: (synchronized: boolean) => void;
  onProvider: (provider: "google" | "openstreetmap") => void;
  roadRoute?: RoadRoute | null;
}) {
  const element = useRef<HTMLDivElement>(null),
    map = useRef<MapInstance | null>(null),
    api = useRef<MapsApi | null>(null),
    select = useRef(onSelect);
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const [openConfig, setOpenConfig] = useState<{ tiles: string } | null>(null);
  select.current = onSelect;
  useEffect(() => {
    let cancelled = false;
    fetch("/api/map-config", { cache: "no-store" })
      .then((r) => r.json())
      .then(async (config) => {
        if (!config.browserKey || !config.mapId) {
          setOpenConfig({
            tiles:
              config.tiles || "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          });
          onProvider("openstreetmap");
          return;
        }
        const maps = await mapsSdk(config.browserKey);
        if (cancelled || !element.current) return;
        api.current = maps;
        map.current = new maps.Map(element.current, {
          center: { lat: 22.5, lng: 79 },
          zoom: 5,
          mapId: config.mapId,
          mapTypeControl: true,
          streetViewControl: false,
        });
        setReady(true);
        onProvider("google");
        onMode(true);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          onMode(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onMode, onProvider]);
  useEffect(() => {
    if (
      !ready ||
      !map.current ||
      !api.current ||
      !roadRoute?.coordinates.length
    )
      return;
    const path = roadRoute.coordinates.map(([lng, lat]) => ({ lat, lng }));
    const line = new api.current.Polyline({
      map: map.current,
      path,
      strokeColor: "#214c36",
      strokeWeight: 6,
    });
    const bounds = new api.current.LatLngBounds();
    path.forEach((p) => bounds.extend(p));
    map.current.fitBounds(bounds, 55);
    return () => line.setMap(null);
  }, [ready, roadRoute]);
  useEffect(() => {
    if (!ready || !map.current || !api.current) return;
    const markers: Marker[] = [],
      listeners: { remove: () => void }[] = [],
      bounds = new api.current.LatLngBounds();
    let count = 0;
    for (const s of stations) {
      if (!s.location) continue;
      const point = { lat: s.location.latitude, lng: s.location.longitude };
      bounds.extend(point);
      count++;
      const pin = document.createElement("button");
      pin.className = `controlled-pin ${selected?.id === s.id ? "selected" : ""}`;
      pin.textContent = "⚡";
      pin.setAttribute("aria-label", s.name);
      const marker = new api.current.marker.AdvancedMarkerElement({
        map: map.current,
        position: point,
        title: s.name,
        content: pin,
      });
      pin.onclick = () => select.current(s);
      markers.push(marker);
    }
    if (position) {
      const point = { lat: position.latitude, lng: position.longitude };
      bounds.extend(point);
      count++;
      const dot = document.createElement("span");
      dot.className = "customer-map-dot";
      dot.setAttribute("aria-label", "Your captured position");
      markers.push(
        new api.current.marker.AdvancedMarkerElement({
          map: map.current,
          position: point,
          title: "Your captured position",
          content: dot,
        }),
      );
    }
    if (roadRoute?.coordinates.length) {
      const routeBounds = new api.current.LatLngBounds();
      roadRoute.coordinates.forEach(([lng, lat]) =>
        routeBounds.extend({ lat, lng }),
      );
      map.current.fitBounds(routeBounds, 55);
    } else if (focusYou && position) {
      map.current.panTo({ lat: position.latitude, lng: position.longitude });
      map.current.setZoom(16);
    } else if (selected?.location) {
      map.current.panTo({
        lat: selected.location.latitude,
        lng: selected.location.longitude,
      });
      map.current.setZoom(16);
    } else if (count) map.current.fitBounds(bounds, 65);
    return () => {
      markers.forEach((marker) => (marker.map = null));
      listeners.forEach((l) => l.remove());
    };
  }, [stations, position, selected, ready, focusYou, roadRoute]);
  if (openConfig)
    return (
      <OpenStationMap
        stations={stations}
        position={position}
        selected={selected}
        onSelect={onSelect}
        focusYou={focusYou}
        route={roadRoute}
        tiles={openConfig.tiles}
        onReady={() => onMode(true)}
      />
    );
  return (
    <>
      <div
        ref={element}
        className="controlled-map"
        role="region"
        aria-label="Station map with filtered charger markers"
        hidden={failed}
      />
      {!ready && !failed && (
        <p className="map-fallback-note" role="status">
          Loading the filtered station map…
        </p>
      )}
      {failed && (
        <p className="map-fallback-note" role="status">
          The synchronized map could not load. The list still shows your
          filtered results. Retry your connection or continue using the list.
        </p>
      )}
    </>
  );
}
