import assert from "node:assert/strict";
import sharp from "sharp";
import { prepareChargerPhoto } from "../app/lib/host-photo.mjs";
import {
  validEvidencePosition,
  stationFromGoogle,
} from "../app/lib/stations.ts";
import {
  decodePolyline,
  roadLabel,
  validRoadMetric,
} from "../app/lib/road-route.ts";
const now = Date.now(),
  point = { latitude: 12.97, longitude: 77.59 };
assert.equal(
  validEvidencePosition(point, 20, new Date(now).toISOString(), now),
  true,
);
for (const [p, a, t] of [
  [point, 101, now],
  [point, 20, now - 121000],
  [point, 20, now + 61000],
  [{ latitude: null, longitude: 77 }, 20, now],
])
  assert.equal(
    validEvidencePosition(p, a, new Date(t).toISOString(), now),
    false,
  );
const input = await sharp({
  create: { width: 2100, height: 1000, channels: 3, background: "green" },
})
  .jpeg()
  .withMetadata({ exif: { IFD0: { Artist: "Synthetic test metadata" } } })
  .toBuffer();
const output = await prepareChargerPhoto(input),
  metadata = await sharp(output).metadata();
assert.equal(metadata.format, "jpeg");
assert.equal(metadata.width, 1920);
assert.equal(metadata.exif, undefined);
await assert.rejects(
  prepareChargerPhoto(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
    ),
  ),
);
await assert.rejects(prepareChargerPhoto(Buffer.from("not a photo")));
assert.equal(
  validRoadMetric({ distanceMeters: 1000, durationSeconds: 300 }),
  true,
);
assert.equal(
  validRoadMetric({ distanceMeters: null, durationSeconds: 300 }),
  false,
);
assert.equal(
  roadLabel({ distanceMeters: 2410, durationSeconds: 601 }),
  "2.4 km drive · 10 min",
);
assert.deepEqual(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@"), [
  [-120.2, 38.5],
  [-120.95, 40.7],
  [-126.453, 43.252],
]);
assert.throws(() => decodePolyline("_"));
const place = stationFromGoogle({
  id: "fixture",
  googleMapsUri: "https://maps.google.com/?cid=fixture",
  reviews: [
    {
      authorAttribution: {
        displayName: "Synthetic reviewer",
        uri: "https://www.google.com/maps/contrib/fixture",
      },
      rating: 4,
      text: { text: "Synthetic review fixture" },
      relativePublishTimeDescription: "A test",
      googleMapsUri: "https://www.google.com/maps/reviews/fixture",
    },
  ],
});
assert.equal(place.reviews[0].author, "Synthetic reviewer");
assert.equal(place.reviews[0].rating, 4);
assert.equal(place.reviews[0].text, "Synthetic review fixture");
console.log(
  "PASS: fresh GPS evidence, image decoding/resizing/metadata removal, rejected non-photo uploads, route metrics/polyline parsing and attributed Google reviews.",
);
