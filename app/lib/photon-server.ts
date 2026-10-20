import "server-only";
import { allowance, protect } from "./rate-limit";
import { HttpError } from "./http";
import {
  distanceKm,
  readableAddress,
  stationFromPhoton,
  type PhotonFeature,
  type Point,
} from "./stations";

async function photon(
  request: Request,
  path: string,
  parameters: Record<string, string>,
) {
  await protect(request, "open-map", 12, 600);
  if (
    !(await allowance(
      `photon:daily:${new Date().toISOString().slice(0, 10)}`,
      200,
      86400,
    ))
  )
    throw new HttpError(
      429,
      "Today’s address and nearby lookup allowance has been reached. Please use Google Maps.",
    );
  const base = new URL(
    process.env.PHOTON_BASE_URL || "https://photon.komoot.io",
  );
  if (base.protocol !== "https:") throw Error("Invalid geocoder configuration");
  const url = new URL(path, base);
  url.search = new URLSearchParams({ ...parameters, lang: "en" }).toString();
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "ChargeNeighbour/1.0 (+https://chargeneighbour-theta.vercel.app/support)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new HttpError(
      503,
      "The map-data lookup is busy. Please try again or open Google Maps.",
    );
  return (await response.json()) as { features?: PhotonFeature[] };
}
export async function nearbyOpenStations(request: Request, point: Point) {
  const data = await photon(request, "/reverse", {
    lat: String(point.latitude),
    lon: String(point.longitude),
    radius: "25",
    limit: "20",
    osm_tag: "amenity:charging_station",
  });
  const stations = (data.features || [])
    .map(stationFromPhoton)
    .filter((s) => s !== null)
    .filter((s) => distanceKm(point, s.location!) <= 25);
  return [...new Map(stations.map((s) => [s.id, s])).values()]
    .sort(
      (a, b) => distanceKm(point, a.location!) - distanceKm(point, b.location!),
    )
    .slice(0, 20);
}
export async function openSearchPoint(
  request: Request,
  query: string,
): Promise<Point | null> {
  const data = await photon(request, "/api", {
    q: query,
    countrycode: "IN",
    limit: "1",
  });
  const coordinates = data.features?.[0]?.geometry?.coordinates;
  return coordinates
    ? { latitude: coordinates[1], longitude: coordinates[0] }
    : null;
}
export async function openAddress(request: Request, point: Point) {
  const data = await photon(request, "/reverse", {
    lat: String(point.latitude),
    lon: String(point.longitude),
    radius: "1",
    limit: "1",
  });
  const properties = data.features?.[0]?.properties;
  const address = properties
    ? readableAddress({ ...properties, housenumber: undefined })
    : "";
  if (!address)
    throw new HttpError(
      404,
      "An address is not mapped here yet. Your location is still shown on the map.",
    );
  return address;
}
