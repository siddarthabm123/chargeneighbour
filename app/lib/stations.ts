export type Point = { latitude: number; longitude: number };
export function validEvidencePosition(
  point: unknown,
  accuracy: unknown,
  capturedAt: unknown,
  now = Date.now(),
) {
  const stamp = typeof capturedAt === "string" ? Date.parse(capturedAt) : NaN;
  return (
    validPoint(point) &&
    typeof accuracy === "number" &&
    Number.isFinite(accuracy) &&
    accuracy >= 0 &&
    accuracy <= 100 &&
    Number.isFinite(stamp) &&
    now - stamp <= 120000 &&
    now - stamp >= -60000
  );
}
export type Connector = {
  type?: string;
  maxChargeRateKw?: number;
  count?: number;
  availableCount?: number;
  outOfServiceCount?: number;
  availabilityLastUpdateTime?: string;
};
export type Station = {
  source?: "google" | "openstreetmap";
  id: string;
  name: string;
  address: string;
  url: string;
  status?: string;
  location?: Point;
  phone?: string;
  website?: string;
  openNow?: boolean;
  hours?: string[];
  rating?: number;
  ratingCount?: number;
  reviews?: {
    author: string;
    authorUrl?: string;
    rating?: number;
    text: string;
    time?: string;
    url?: string;
  }[];
  connectorCount?: number;
  connectors: Connector[];
  photos: {
    name: string;
    url?: string;
    authors: { name: string; url?: string }[];
  }[];
  photosUrl?: string;
  reviewsUrl?: string;
  attributions: { provider: string; uri: string }[];
};
export function validPoint(value: unknown): value is Point {
  const p = value as Point | null;
  return (
    !!p &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180
  );
}
export function distanceKm(a: Point, b: Point) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.latitude - a.latitude) * rad) / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(((b.longitude - a.longitude) * rad) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function connectorName(type?: string) {
  const names: Record<string, string> = {
    TYPE_2: "Type 2 AC",
    CCS_COMBO_2: "CCS2",
    CCS_COMBO_1: "CCS1",
    CHADEMO: "CHAdeMO",
    J1772: "Type 1",
    TESLA: "Tesla",
    NACS: "NACS",
    UNSPECIFIED_GB_T: "GB/T",
    UNSPECIFIED_WALL_OUTLET: "Wall outlet",
  };
  return (
    names[(type || "").replace("EV_CONNECTOR_TYPE_", "")] ||
    "Connector not specified"
  );
}
export function freshAvailability(c: Connector, now = Date.now()) {
  const updated = Date.parse(c.availabilityLastUpdateTime || "");
  // Only recent, explicitly supplied counts can support an availability claim.
  return (
    Number.isFinite(updated) &&
    now - updated >= -60000 &&
    now - updated <= 15 * 60000 &&
    Number.isInteger(c.availableCount) &&
    c.availableCount! >= 0
  );
}
export function availableConnectors(
  station: Station,
  connector = "",
  power = 0,
  now = Date.now(),
) {
  if (station.status && station.status !== "OPERATIONAL") return 0;
  if (station.openNow === false) return 0;
  return station.connectors
    .filter(
      (c) =>
        (!connector || c.type === connector) &&
        (!power || (c.maxChargeRateKw || 0) >= power) &&
        freshAvailability(c, now),
    )
    .reduce((sum, c) => sum + c.availableCount!, 0);
}
export function matchesStation(
  station: Station,
  connector: string,
  power: number,
) {
  return (
    (!connector && !power) ||
    station.connectors.some(
      (c) =>
        (!connector || c.type === connector) &&
        (!power || (c.maxChargeRateKw || 0) >= power),
    )
  );
}
export const googleSearchUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`EV charging stations near ${query.trim() || "India"}`)}`;
export function stationCategory(station: Pick<Station, "name">) {
  return /\bswap(?:ping)?\b|e:swap/i.test(station.name) ? "swap" : "charging";
}
export function canPublishHostPhoto(
  listing: { status: string; application_id: string },
  application: {
    id: string;
    user_id: string;
    status: string;
    payload: { evidenceId?: string; publicPhotoConsent?: boolean };
  },
  evidence: { id: string; user_id: string },
) {
  return (
    listing.status === "approved" &&
    listing.application_id === application.id &&
    application.status !== "cancelled" &&
    application.payload.publicPhotoConsent === true &&
    application.payload.evidenceId === evidence.id &&
    application.user_id === `supabase:${evidence.user_id}`
  );
}
export function unknownSpecs(
  station: Station,
  connector: string,
  power: number,
) {
  return (
    !station.connectors.length ||
    station.connectors.some(
      (c) =>
        (!connector || !c.type || c.type === connector) &&
        (!power || !c.maxChargeRateKw || c.maxChargeRateKw >= power) &&
        (!c.type || !c.maxChargeRateKw),
    )
  );
}
export function directionsUrl(station: Station, origin?: Point | null) {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set(
    "destination",
    station.source === "openstreetmap" && station.location
      ? `${station.location.latitude},${station.location.longitude}`
      : station.address || station.name,
  );
  if (station.source !== "openstreetmap")
    url.searchParams.set("destination_place_id", station.id);
  url.searchParams.set("travelmode", "driving");
  if (origin)
    url.searchParams.set("origin", `${origin.latitude},${origin.longitude}`);
  return url.href;
}

export type PhotonFeature = {
  geometry?: { coordinates?: number[] };
  properties?: Record<string, unknown>;
};
export function readableAddress(properties: Record<string, unknown>) {
  const text = (key: string) =>
    typeof properties[key] === "string" ? properties[key].trim() : "";
  const street = [text("housenumber"), text("street")]
    .filter(Boolean)
    .join(" ");
  const parts = [
    street,
    text("locality"),
    text("district"),
    text("city"),
    text("state"),
    text("postcode"),
    text("country"),
  ].filter(Boolean);
  return [
    ...new Map(
      parts.map((part) => [part.toLocaleLowerCase("en"), part]),
    ).values(),
  ].join(", ");
}
export function stationFromPhoton(feature: PhotonFeature): Station | null {
  const p = feature.properties,
    coordinates = feature.geometry?.coordinates;
  if (
    !p ||
    !coordinates ||
    p.osm_key !== "amenity" ||
    p.osm_value !== "charging_station"
  )
    return null;
  const location = { latitude: coordinates[1], longitude: coordinates[0] };
  const type = (
    { N: "node", W: "way", R: "relation" } as Record<string, string>
  )[String(p.osm_type)];
  if (
    !validPoint(location) ||
    !type ||
    !Number.isSafeInteger(p.osm_id) ||
    Number(p.osm_id) <= 0
  )
    return null;
  const name =
    typeof p.name === "string" && p.name.trim()
      ? p.name.trim()
      : "Unnamed EV charging station";
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set(
    "query",
    `${name} near ${location.latitude},${location.longitude}`,
  );
  return {
    source: "openstreetmap",
    id: `osm:${type}:${p.osm_id}`,
    name,
    address:
      readableAddress(p) ||
      "Street address not mapped — open the location on the map",
    location,
    url: url.href,
    connectors: [],
    photos: [],
    attributions: [
      {
        provider: "© OpenStreetMap contributors",
        uri: "https://www.openstreetmap.org/copyright",
      },
    ],
  };
}
export function distanceLabel(origin: Point, destination: Point) {
  const km = distanceKm(origin, destination);
  return km < 1
    ? `${Math.max(1, Math.round(km * 1000))} m away`
    : `${km.toFixed(1)} km away`;
}

export function safeWebLink(value: unknown, googleOnly = false) {
  try {
    const u = new URL(String(value || ""));
    return u.protocol === "https:" &&
      (!googleOnly ||
        u.hostname === "google.com" ||
        u.hostname.endsWith(".google.com") ||
        u.hostname === "maps.app.goo.gl")
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
}
type Place = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  location?: Station["location"];
  nationalPhoneNumber?: string;
  websiteUri?: string;
  currentOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
  rating?: number;
  userRatingCount?: number;
  reviews?: {
    authorAttribution?: { displayName?: string; uri?: string };
    rating?: number;
    text?: { text?: string };
    relativePublishTimeDescription?: string;
    googleMapsUri?: string;
  }[];
  googleMapsLinks?: { photosUri?: string; reviewsUri?: string };
  evChargeOptions?: {
    connectorCount?: number;
    connectorAggregation?: Connector[];
  };
  photos?: {
    name: string;
    authorAttributions?: { displayName: string; uri?: string }[];
  }[];
  attributions?: { provider: string; providerUri: string }[];
};
export function stationFromGoogle(p: Place): Station | null {
  const url = safeWebLink(p.googleMapsUri, true);
  if (!url || !p.id) return null;
  return {
    id: p.id,
    name: p.displayName?.text || "EV charging station",
    address: p.formattedAddress || "Address not supplied",
    url,
    status: p.businessStatus,
    location: validPoint(p.location) ? p.location : undefined,
    phone: p.nationalPhoneNumber,
    website: safeWebLink(p.websiteUri),
    openNow: p.currentOpeningHours?.openNow,
    hours: p.currentOpeningHours?.weekdayDescriptions,
    rating: p.rating,
    ratingCount: p.userRatingCount,
    reviews: (p.reviews || []).slice(0, 5).map((r) => ({
      author: r.authorAttribution?.displayName || "Google Maps contributor",
      authorUrl: safeWebLink(r.authorAttribution?.uri),
      rating: r.rating,
      text: r.text?.text || "",
      time: r.relativePublishTimeDescription,
      url: safeWebLink(r.googleMapsUri, true),
    })),
    connectorCount: p.evChargeOptions?.connectorCount,
    connectors: p.evChargeOptions?.connectorAggregation || [],
    photos: (p.photos || [])
      .slice(0, 4)
      .filter((photo) =>
        /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(photo.name),
      )
      .map((photo) => ({
        name: photo.name,
        authors: (photo.authorAttributions || []).map((a) => ({
          name: a.displayName,
          url: safeWebLink(a.uri),
        })),
      })),
    photosUrl: safeWebLink(p.googleMapsLinks?.photosUri, true),
    reviewsUrl: safeWebLink(p.googleMapsLinks?.reviewsUri, true),
    attributions: (p.attributions || []).flatMap((a) => {
      const uri = safeWebLink(a.providerUri);
      return uri ? [{ provider: a.provider, uri }] : [];
    }),
  };
}
