"use client";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { Point, Station } from "./lib/stations";
import type { RoadRoute } from "./lib/road-route";
export default function OpenStationMap({
  stations,
  position,
  selected,
  onSelect,
  route,
  focusYou,
  tiles,
  onReady,
}: {
  stations: Station[];
  position: Point | null;
  selected: Station | null;
  onSelect: (s: Station) => void;
  route?: RoadRoute | null;
  focusYou?: boolean;
  tiles: string;
  onReady: () => void;
}) {
  const element = useRef<HTMLDivElement>(null),
    map = useRef<Leaflet.Map | null>(null),
    [api, setApi] = useState<typeof Leaflet | null>(null),
    select = useRef(onSelect),
    ready = useRef(onReady);
  const lastCamera = useRef("");
  select.current = onSelect;
  ready.current = onReady;
  useEffect(() => {
    let cancelled = false,
      observer: ResizeObserver | undefined;
    void import("leaflet").then((L) => {
      if (cancelled || !element.current) return;
      const m = L.map(element.current, { scrollWheelZoom: false }).setView(
        [22.5, 79],
        5,
      );
      map.current = m;
      L.tileLayer(tiles, {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · <a href="https://www.openstreetmap.org/fixthemap">Fix the map</a>',
      }).addTo(m);
      observer = new ResizeObserver(() => m.invalidateSize());
      observer.observe(element.current);
      setApi(L);
      ready.current();
    });
    return () => {
      cancelled = true;
      observer?.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, [tiles]);
  useEffect(() => {
    if (!api || !map.current) return;
    const L = api,
      m = map.current,
      group = L.layerGroup().addTo(m),
      bounds = L.latLngBounds([]);
    for (const station of stations) {
      if (!station.location) continue;
      const point: L.LatLngTuple = [
        station.location.latitude,
        station.location.longitude,
      ];
      bounds.extend(point);
      L.marker(point, {
        title: station.name,
        icon: L.divIcon({
          className: "open-map-marker",
          html: '<span aria-hidden="true">⚡</span>',
          iconSize: [34, 40],
          iconAnchor: [17, 40],
        }),
      })
        .on("click", () => select.current(station))
        .addTo(group);
    }
    if (position) {
      const p: L.LatLngTuple = [position.latitude, position.longitude];
      bounds.extend(p);
      L.circleMarker(p, {
        radius: 9,
        color: "white",
        weight: 3,
        fillColor: "#267dcc",
        fillOpacity: 1,
      })
        .bindTooltip("Your captured GPS location")
        .addTo(group);
    }
    const camera = route
      ? `route:${route.calculatedAt}`
      : focusYou && position
        ? `you:${position.latitude},${position.longitude}`
        : selected
          ? `station:${selected.id}`
          : `results:${stations.map((s) => s.id).join(",")}:${position?.latitude},${position?.longitude}`;
    const moveCamera = camera !== lastCamera.current;
    lastCamera.current = camera;
    if (route?.coordinates.length) {
      const points = route.coordinates.map(
        ([lng, lat]) => [lat, lng] as L.LatLngTuple,
      );
      L.polyline(points, { color: "white", weight: 10 }).addTo(group);
      L.polyline(points, { color: "#214c36", weight: 6 }).addTo(group);
      if (moveCamera)
        m.fitBounds(L.latLngBounds(points), { padding: [35, 35], maxZoom: 16 });
    } else if (moveCamera && focusYou && position)
      m.setView([position.latitude, position.longitude], 16);
    else if (moveCamera && selected?.location)
      m.setView([selected.location.latitude, selected.location.longitude], 16);
    else if (moveCamera && bounds.isValid())
      m.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
    return () => {
      group.remove();
    };
  }, [stations, position, selected, route, focusYou, api]);
  return (
    <div
      ref={element}
      className="controlled-map open-station-map"
      role="region"
      aria-label="Interactive station and driving-route map"
    />
  );
}
