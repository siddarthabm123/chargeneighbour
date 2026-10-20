"use client";
import { useEffect, useState } from "react";
import {
  energyQuote,
  validVehicle,
  vehicleConnections,
  type Choice,
} from "./lib/charger-choice";
import { rupees } from "./lib/reservations";

export function useVehicle() {
  const [vehicle, setVehicle] = useState<string[]>([]);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("cn_vehicle_connections") || "[]",
      );
      if (validVehicle(saved)) setVehicle(saved);
    } catch {}
  }, []);
  function change(next: string[]) {
    setVehicle(next);
    try {
      if (next.length)
        sessionStorage.setItem("cn_vehicle_connections", JSON.stringify(next));
      else sessionStorage.removeItem("cn_vehicle_connections");
    } catch {}
  }
  return [vehicle, change] as const;
}
export function VehiclePicker({
  vehicle,
  onChange,
}: {
  vehicle: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <details className="vehicle-picker">
      <summary>
        My EV connections
        {vehicle.length
          ? ` · ${vehicle.map((v) => vehicleConnections.find((c) => c.value === v)?.label).join(", ")}`
          : " · choose to match chargers"}
      </summary>
      <p>
        Select connections physically supported by your vehicle. Check your
        vehicle manual. These preferences stay in this tab and do not identify a
        vehicle.
      </p>
      <div className="vehicle-options">
        {vehicleConnections.map((c) => (
          <label key={c.value}>
            <input
              type="checkbox"
              checked={vehicle.includes(c.value)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...vehicle, c.value]
                    : vehicle.filter((v) => v !== c.value),
                )
              }
            />
            {c.label}
          </label>
        ))}
      </div>
      <button type="button" className="text-link" onClick={() => onChange([])}>
        Clear vehicle preferences
      </button>
    </details>
  );
}
export function Comparison({
  items,
  onRemove,
  onChoose,
  demo = false,
}: {
  items: Choice[];
  onRemove?: (id: string) => void;
  onChoose?: (id: string) => void;
  demo?: boolean;
}) {
  const [energy, setEnergy] = useState(10);
  if (!items.length) return null;
  return (
    <section
      className="charger-comparison"
      aria-label={
        demo ? "Sample charger comparison" : "Compare selected chargers"
      }
    >
      <h3>
        {demo
          ? "Comparison demo · fictional examples"
          : `Compare ${items.length} selected chargers`}
      </h3>
      {demo && (
        <p className="demo-label">
          SAMPLE PRICES AND DISTANCES · NO REAL LISTINGS OR BOOKINGS
        </p>
      )}
      <label className="comparison-energy">
        Compare the same energy amount{" "}
        <input
          type="number"
          min="1"
          max="200"
          step="1"
          value={energy}
          onChange={(e) => setEnergy(Number(e.target.value))}
        />
        kWh
      </label>
      <p>
        Cost is an estimate for the selected energy, not a charging-speed or
        availability guarantee. Unknown prices are never treated as free.
      </p>
      <div
        className="comparison-scroll"
        tabIndex={0}
        role="region"
        aria-label="Charger comparison table, scroll horizontally"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Compare</th>
              {items.map((c) => (
                <th scope="col" key={c.id}>
                  {c.name}
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(c.id)}
                      aria-label={`Remove ${c.name} from comparison`}
                    >
                      Remove
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["Connector", (c: Choice) => c.connector],
                ["Power", (c: Choice) => c.power],
                ["Road distance / time", (c: Choice) => c.distance],
                ["Availability", (c: Choice) => c.availability],
                ["Review", (c: Choice) => c.review],
                [
                  "Energy rate",
                  (c: Choice) =>
                    c.ratePaise
                      ? `${rupees(c.ratePaise)}/kWh`
                      : "Price unconfirmed",
                ],
                [
                  `Estimate for ${energy || "—"} kWh`,
                  (c: Choice) => {
                    const quote = energyQuote(c.ratePaise, energy);
                    return quote === null
                      ? "No confirmed estimate"
                      : rupees(quote);
                  },
                ],
                ["Price scope", (c: Choice) => c.scope],
              ] as [string, (c: Choice) => string][]
            ).map(([label, value]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {items.map((c) => (
                  <td key={c.id}>{value(c)}</td>
                ))}
              </tr>
            ))}
            {onChoose && (
              <tr>
                <th scope="row">Explore</th>
                {items.map((c) => (
                  <td key={c.id}>
                    <button
                      type="button"
                      className="button outline"
                      onClick={() => onChoose(c.id)}
                    >
                      View charger
                    </button>
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="tiny">
        On a phone, swipe the table horizontally to compare. Public mapped
        stations are separate from approved participating hosts.
      </p>
    </section>
  );
}
export const demoChoices: Choice[] = [
  {
    id: "demo-a",
    name: "Sample stop A",
    connector: "Type 2 AC",
    power: "7.2 kW (sample)",
    distance: "2.4 km drive · 8 min (sample)",
    availability: "Sample host-confirmed slot",
    review: "Fictional demonstration",
    ratePaise: 1600,
    scope: "Illustrative all-in rate",
  },
  {
    id: "demo-b",
    name: "Sample stop B",
    connector: "Type 2 AC",
    power: "11 kW (sample)",
    distance: "4.1 km drive · 12 min (sample)",
    availability: "Sample status needs confirmation",
    review: "Fictional demonstration",
    ratePaise: 1400,
    scope: "Illustrative all-in rate",
  },
  {
    id: "demo-c",
    name: "Sample stop C",
    connector: "CCS2 DC",
    power: "50 kW (sample)",
    distance: "6.8 km drive · 18 min (sample)",
    availability: "Sample status unknown",
    review: "Fictional demonstration",
    scope: "Price unconfirmed",
  },
];
