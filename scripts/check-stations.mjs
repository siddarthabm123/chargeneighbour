import assert from "node:assert/strict";
import {
  availableConnectors,
  connectorName,
  directionsUrl,
  distanceKm,
  freshAvailability,
  matchesStation,
  stationFromGoogle,
  validPoint,
  readableAddress,
  stationFromPhoton,
  distanceLabel,
  stationCategory,
  unknownSpecs,
  canPublishHostPhoto,
} from "../app/lib/stations.ts";

assert.equal(stationCategory({ name: "Honda e:swap" }), "swap");
assert.equal(stationCategory({ name: "Battery Swapping Station" }), "swap");
assert.equal(stationCategory({ name: "Public charger" }), "charging");
assert.equal(unknownSpecs({ connectors: [] }, "TYPE_2", 7), true);
assert.equal(
  unknownSpecs(
    { connectors: [{ type: "TYPE_2", maxChargeRateKw: 7.2 }] },
    "TYPE_2",
    7,
  ),
  false,
);
const photoListing = { status: "approved", application_id: "application" },
  photoApp = {
    id: "application",
    user_id: "supabase:owner",
    status: "pending_review",
    payload: { evidenceId: "photo", publicPhotoConsent: true },
  },
  photoEvidence = { id: "photo", user_id: "owner" };
assert.equal(canPublishHostPhoto(photoListing, photoApp, photoEvidence), true);
for (const [listing, app, evidence] of [
  [{ ...photoListing, status: "suspended" }, photoApp, photoEvidence],
  [photoListing, { ...photoApp, status: "cancelled" }, photoEvidence],
  [
    photoListing,
    {
      ...photoApp,
      payload: { ...photoApp.payload, publicPhotoConsent: false },
    },
    photoEvidence,
  ],
  [photoListing, photoApp, { ...photoEvidence, user_id: "stranger" }],
  [photoListing, photoApp, { ...photoEvidence, id: "other-photo" }],
  [
    { ...photoListing, application_id: "another-application" },
    photoApp,
    photoEvidence,
  ],
])
  assert.equal(canPublishHostPhoto(listing, app, evidence), false);

const now = Date.now(),
  point = { latitude: 12.97, longitude: 77.59 };
assert.ok(validPoint(point));
for (const invalid of [
  { latitude: null, longitude: 0 },
  { latitude: 91, longitude: 0 },
  { latitude: 0, longitude: Infinity },
  null,
])
  assert.equal(validPoint(invalid), false);
assert.equal(distanceKm(point, point), 0);
assert.ok(
  Math.abs(
    distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) -
      111.195,
  ) < 0.01,
);
const c = {
  type: "EV_CONNECTOR_TYPE_CCS_COMBO_2",
  maxChargeRateKw: 60,
  count: 2,
  availableCount: 1,
  availabilityLastUpdateTime: new Date(now - 60000).toISOString(),
};
const station = stationFromGoogle({
  id: "test",
  displayName: { text: "Synthetic unit-test station" },
  formattedAddress: "Synthetic address",
  googleMapsUri: "https://maps.google.com/?cid=test",
  location: point,
  evChargeOptions: { connectorCount: 2, connectorAggregation: [c] },
  currentOpeningHours: { openNow: true },
  photos: [
    {
      name: "places/test/photos/photo",
      authorAttributions: [
        {
          displayName: "Test photographer",
          uri: "https://maps.google.com/contrib/test",
        },
      ],
    },
  ],
  googleMapsLinks: { photosUri: "https://maps.google.com/photos/test" },
});
assert.equal(station.connectors[0].maxChargeRateKw, 60);
assert.equal(station.photos[0].authors[0].name, "Test photographer");
assert.equal(availableConnectors(station, c.type, 50, now), 1);
assert.equal(
  availableConnectors(station, "EV_CONNECTOR_TYPE_TYPE_2", 0, now),
  0,
);
assert.equal(matchesStation(station, c.type, 100), false);
assert.equal(matchesStation(station, c.type, 50), true);
assert.equal(connectorName(c.type), "CCS2");
assert.equal(
  availableConnectors({ ...station, openNow: false }, "", 0, now),
  0,
);
assert.equal(
  availableConnectors({ ...station, status: "CLOSED_TEMPORARILY" }, "", 0, now),
  0,
);
assert.equal(
  freshAvailability({ ...c, availabilityLastUpdateTime: undefined }, now),
  false,
);
assert.equal(
  freshAvailability(
    {
      ...c,
      availabilityLastUpdateTime: new Date(now - 16 * 60000).toISOString(),
    },
    now,
  ),
  false,
);
assert.equal(
  freshAvailability(
    {
      ...c,
      availabilityLastUpdateTime: new Date(now + 5 * 60000).toISOString(),
    },
    now,
  ),
  false,
);
assert.equal(
  freshAvailability({ ...c, availableCount: undefined }, now),
  false,
);
assert.equal(freshAvailability({ ...c, availableCount: 0 }, now), true);
assert.equal(
  stationFromGoogle({ id: "x", googleMapsUri: "https://untrusted.example/" }),
  null,
);
const link = new URL(directionsUrl(station, point));
assert.equal(link.searchParams.get("origin"), "12.97,77.59");
assert.equal(link.searchParams.get("destination_place_id"), "test");
assert.equal(new URL(directionsUrl(station)).searchParams.has("origin"), false);
const openStation = stationFromPhoton({
  geometry: { coordinates: [77.59, 12.97] },
  properties: {
    osm_type: "N",
    osm_id: 123,
    osm_key: "amenity",
    osm_value: "charging_station",
    name: "Synthetic mapped charger",
    street: "Test Road",
    district: "Test Area",
    city: "Test City",
    state: "Test State",
    postcode: "123456",
    country: "India",
  },
});
assert.ok(openStation);
assert.equal(openStation.name, "Synthetic mapped charger");
assert.equal(
  openStation.address,
  "Test Road, Test Area, Test City, Test State, 123456, India",
);
assert.equal(openStation.source, "openstreetmap");
assert.equal(availableConnectors(openStation), 0);
const openDirections = new URL(directionsUrl(openStation, point));
assert.equal(openDirections.searchParams.get("destination"), "12.97,77.59");
assert.equal(openDirections.searchParams.has("destination_place_id"), false);
assert.equal(
  stationFromPhoton({ properties: { osm_key: "amenity", osm_value: "cafe" } }),
  null,
);
assert.equal(
  stationFromPhoton({
    geometry: { coordinates: [999, 999] },
    properties: {
      osm_key: "amenity",
      osm_value: "charging_station",
      osm_type: "N",
      osm_id: 1,
    },
  }),
  null,
);
assert.equal(
  readableAddress({
    street: "Test Road",
    locality: "Test Area",
    district: "test area",
    city: "Test City",
    name: "A nearby business",
  }),
  "Test Road, test area, Test City",
);
assert.equal(readableAddress({ name: "A nearby business" }), "");
assert.equal(
  distanceLabel(point, { latitude: 12.971, longitude: 77.59 }),
  "111 m away",
);
assert.equal(
  distanceLabel(point, { latitude: 12.98, longitude: 77.59 }),
  "1.1 km away",
);
console.log(
  "PASS: location validation, readable addresses, real-source station parsing, metre/km distances, connector compatibility, fresh availability, photo attribution and provider-correct directions.",
);

if (process.env.CHECK_BASE_URL) {
  const base = new URL(process.env.CHECK_BASE_URL);
  assert.ok(["localhost", "127.0.0.1"].includes(base.hostname));
  const url = new URL("/api/chargers", base);
  const send = (body, origin = base.origin) =>
    fetch(url, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal((await send(point, "https://other.example")).status, 403);
  assert.equal((await send({ latitude: 200, longitude: 77 })).status, 400);
  assert.equal((await send({ latitude: "12", longitude: 77 })).status, 400);
  assert.equal((await send({ ...point, extra: "x".repeat(600) })).status, 413);
  assert.equal((await send(point)).status, 503);
  assert.equal(
    (await fetch(new URL("/api/chargers/photo?name=../secret", base))).status,
    400,
  );
  const photo = await fetch(
    new URL("/api/chargers/photo?name=places/test/photos/photo", base),
  );
  assert.equal(photo.status, 503);
  assert.match(photo.headers.get("cache-control"), /no-store/);
  console.log(
    "PASS: location endpoint origin checks, bounded valid coordinates, absent API configuration and protected photo references.",
  );
}
