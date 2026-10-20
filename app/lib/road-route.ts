export type RoadMetric = { distanceMeters: number; durationSeconds: number };
export type RoadRoute = RoadMetric & {
  provider: "osrm" | "google";
  coordinates: [number, number][];
  steps: { text: string; distanceMeters: number }[];
  calculatedAt: string;
  origin: { latitude: number; longitude: number };
};
export function roadLabel(metric: RoadMetric) {
  return `${metric.distanceMeters < 1000 ? `${Math.round(metric.distanceMeters)} m` : `${(metric.distanceMeters / 1000).toFixed(1)} km`} drive · ${Math.max(1, Math.round(metric.durationSeconds / 60))} min`;
}
export function validRoadMetric(value: unknown): value is RoadMetric {
  const m = value as RoadMetric | null;
  return (
    !!m &&
    Number.isFinite(m.distanceMeters) &&
    m.distanceMeters >= 0 &&
    Number.isFinite(m.durationSeconds) &&
    m.durationSeconds >= 0
  );
}
export function decodePolyline(encoded: string): [number, number][] {
  let index = 0,
    lat = 0,
    lng = 0;
  const coordinates: [number, number][] = [];
  function next() {
    let shift = 0,
      result = 0,
      byte;
    do {
      if (index >= encoded.length || shift > 30) throw Error("Invalid route");
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 31) << shift;
      shift += 5;
    } while (byte >= 32);
    return result & 1 ? ~(result >> 1) : result >> 1;
  }
  while (index < encoded.length) {
    lat += next();
    lng += next();
    coordinates.push([lng / 1e5, lat / 1e5]);
    if (coordinates.length > 30000) throw Error("Route too large");
  }
  return coordinates;
}
