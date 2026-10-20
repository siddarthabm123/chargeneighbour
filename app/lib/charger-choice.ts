import { freshAvailability, type Station } from "./stations.ts";
export const vehicleConnections = [
  { value: "TYPE_2", label: "Type 2 AC" },
  { value: "CCS_COMBO_2", label: "CCS2 DC" },
  { value: "J1772", label: "Type 1 AC" },
  { value: "CHADEMO", label: "CHAdeMO DC" },
];
export const canonicalConnector = (value = "") =>
  value.replace(/^EV_CONNECTOR_TYPE_/, "");
export function validVehicle(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= vehicleConnections.length &&
    new Set(value).size === value.length &&
    value.every((v) => vehicleConnections.some((c) => c.value === v))
  );
}
export function compatibility(
  station: Pick<Station, "connectors" | "name">,
  vehicle: string[],
) {
  if (!vehicle.length) return "not-set";
  if (/\bswap(?:ping)?\b|e:swap/i.test(station.name)) return "unknown";
  if (
    station.connectors.some(
      (c) => c.type && vehicle.includes(canonicalConnector(c.type)),
    )
  )
    return "compatible";
  return !station.connectors.length ||
    station.connectors.some(
      (c) =>
        !c.type ||
        ["OTHER", "UNSPECIFIED"].includes(canonicalConnector(c.type)),
    )
    ? "unknown"
    : "incompatible";
}
export function availabilityLabel(
  station: Pick<Station, "connectors" | "openNow" | "status">,
  now = Date.now(),
  vehicle: string[] = [],
) {
  if (station.status && station.status !== "OPERATIONAL")
    return "Reported not operational";
  if (station.openNow === false) return "Reported closed · check opening hours";
  const connectors = vehicleConnectors(station, vehicle);
  const fresh = connectors.filter((c) => freshAvailability(c, now));
  if (fresh.length) {
    const count = fresh.reduce((n, c) => n + (c.availableCount || 0), 0);
    const oldest = Math.min(
      ...fresh.map((c) => Date.parse(c.availabilityLastUpdateTime!)),
    );
    return `${count} ${vehicle.length ? "matching " : ""}connectors reported free · updated ${Math.max(0, Math.floor((now - oldest) / 60000))} min ago`;
  }
  const updates = connectors
    .map((c) => Date.parse(c.availabilityLastUpdateTime || ""))
    .filter(Number.isFinite);
  return updates.length
    ? "Availability report out of date · recheck before travelling"
    : "Availability unconfirmed · no live connector feed";
}
export function vehicleConnectors(
  station: Pick<Station, "connectors">,
  vehicle: string[],
) {
  return vehicle.length
    ? station.connectors.filter((c) =>
        vehicle.includes(canonicalConnector(c.type)),
      )
    : station.connectors;
}
export function energyQuote(ratePaise: unknown, energy: number) {
  return typeof ratePaise === "number" &&
    Number.isInteger(ratePaise) &&
    ratePaise > 0 &&
    Number.isFinite(energy) &&
    energy > 0 &&
    energy <= 200
    ? Math.round(ratePaise * energy)
    : null;
}
export function mayManageBooking(actor: string, owner: string | undefined) {
  return !!actor && !!owner && actor === owner;
}
export type Choice = {
  id: string;
  name: string;
  connector: string;
  power: string;
  distance: string;
  availability: string;
  review: string;
  ratePaise?: number;
  scope: string;
};
export function busyBooking(
  b: { status: string; hold_until: string; ends_at: string },
  now = Date.now(),
) {
  return (
    Date.parse(b.ends_at) > now &&
    (["confirmed", "in_progress"].includes(b.status) ||
      (b.status === "requested" && Date.parse(b.hold_until) > now))
  );
}
