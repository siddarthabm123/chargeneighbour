import assert from "node:assert/strict";
import {
  availabilityLabel,
  busyBooking,
  compatibility,
  energyQuote,
  mayManageBooking,
  validVehicle,
  vehicleConnectors,
} from "../app/lib/charger-choice.ts";
import { availableConnectors } from "../app/lib/stations.ts";

const now = Date.parse("2026-10-20T10:00:00Z");
const station = {
  id: "fixture",
  name: "Synthetic charging fixture",
  connectors: [
    {
      type: "EV_CONNECTOR_TYPE_TYPE_2",
      availableCount: 2,
      availabilityLastUpdateTime: "2026-10-20T09:58:00Z",
    },
    {
      type: "EV_CONNECTOR_TYPE_CCS_COMBO_2",
      availableCount: 0,
      availabilityLastUpdateTime: "2026-10-20T09:59:00Z",
    },
  ],
};
assert.equal(validVehicle(["TYPE_2", "CCS_COMBO_2"]), true);
assert.equal(validVehicle([]), true);
for (const value of ["TYPE_2", ["TYPE_2", "TYPE_2"], ["unknown"], null, [null]])
  assert.equal(validVehicle(value), false);
assert.equal(compatibility(station, []), "not-set");
assert.equal(compatibility(station, ["TYPE_2"]), "compatible");
assert.equal(compatibility(station, ["CHADEMO"]), "incompatible");
assert.equal(
  compatibility(
    {
      name: "Unknown type fixture",
      connectors: [{ type: "EV_CONNECTOR_TYPE_OTHER" }],
    },
    ["TYPE_2"],
  ),
  "unknown",
);
assert.equal(
  compatibility({ name: "Unknown fixture", connectors: [] }, ["TYPE_2"]),
  "unknown",
);
assert.equal(
  compatibility({ ...station, name: "Battery swapping fixture" }, ["TYPE_2"]),
  "unknown",
);
assert.match(
  availabilityLabel(station, now),
  /^2 connectors reported free.*2 min ago/,
);
assert.match(
  availabilityLabel(station, now, ["CCS_COMBO_2"]),
  /^0 matching connectors reported free/,
);
assert.equal(
  availableConnectors(
    { ...station, connectors: vehicleConnectors(station, ["CCS_COMBO_2"]) },
    "",
    0,
    now,
  ),
  0,
  "AC availability must not pass a DC driver's availability filter",
);
assert.match(availabilityLabel(station, now + 16 * 60000), /out of date/);
assert.match(
  availabilityLabel(station, now - 10 * 60000),
  /out of date/,
  "Future reports cannot be called fresh",
);
assert.match(availabilityLabel({ ...station, openNow: false }, now), /closed/);
assert.match(
  availabilityLabel({ ...station, status: "CLOSED_TEMPORARILY" }, now),
  /not operational/,
);
assert.match(availabilityLabel({ connectors: [] }, now), /unconfirmed/);
assert.equal(energyQuote(1600, 10), 16000);
assert.equal(energyQuote(1601, 0.5), 801);
for (const rate of [undefined, 0, -1, 1.5, "1600"])
  assert.equal(energyQuote(rate, 10), null);
for (const energy of [0, -1, 201, NaN, Infinity])
  assert.equal(energyQuote(1600, energy), null);
const booking = {
  status: "requested",
  hold_until: "2026-10-20T10:30:00Z",
  ends_at: "2026-10-20T12:00:00Z",
};
assert.equal(busyBooking(booking, now), true);
assert.equal(busyBooking(booking, now + 30 * 60000), false);
assert.equal(
  busyBooking({ ...booking, status: "confirmed" }, now + 31 * 60000),
  true,
);
assert.equal(busyBooking({ ...booking, status: "cancelled" }, now), false);
assert.equal(
  busyBooking({ ...booking, status: "confirmed" }, now + 2 * 3600000),
  false,
);
assert.equal(mayManageBooking("supabase:owner", "supabase:owner"), true);
for (const [actor, owner] of [
  ["supabase:stranger", "supabase:owner"],
  ["owner@example.com", "supabase:owner"],
  ["", ""],
  ["supabase:owner", undefined],
])
  assert.equal(mayManageBooking(actor, owner), false);
console.log(
  "PASS: vehicle fit, connector-specific fresh availability, unknown prices, bounded energy estimates, hold expiry and exact verified-owner checks.",
);
