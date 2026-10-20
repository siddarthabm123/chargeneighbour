import { serviceRest } from "../../../db/server";
import { failure, json } from "../../lib/http";
import { commercialReady } from "../../lib/settings";
import { busyBooking } from "../../lib/charger-choice";
export async function GET() {
  try {
    const chargers = await (
      await serviceRest(
        "host_chargers?status=eq.approved&select=id,name,area,latitude,longitude,power_kw,price_paise_kwh,access_notes,photos,verified_at,checks&order=verified_at.desc&limit=50",
      )
    ).json();
    const slots = chargers.length
      ? await (
          await serviceRest(
            `host_slots?charger_id=in.(${chargers.map((c: { id: string }) => c.id).join(",")})&ends_at=gt.${new Date().toISOString()}&select=id,charger_id,starts_at,ends_at&order=starts_at.asc&limit=200`,
          )
        ).json()
      : [];
    const bookings = chargers.length
      ? await (
          await serviceRest(
            `reservations?charger_id=in.(${chargers.map((c: { id: string }) => c.id).join(",")})&status=in.(requested,confirmed,in_progress)&ends_at=gt.${new Date().toISOString()}&select=charger_id,starts_at,ends_at,status,hold_until&limit=500`,
          )
        ).json()
      : [];
    return json({
      chargers: chargers.map(
        ({
          checks,
          ...c
        }: {
          checks: Record<string, unknown>;
          [key: string]: unknown;
        }) => ({
          ...c,
          review_checks: [
            "identity",
            "permission",
            "electrical",
            "metering",
            "access",
            "support",
            "pricing",
          ].filter((k) => checks?.[k] === true),
        }),
      ),
      slots,
      busyWindows: bookings
        .filter((b: { status: string; hold_until: string; ends_at: string }) =>
          busyBooking(b),
        )
        .map(
          (b: { charger_id: string; starts_at: string; ends_at: string }) => ({
            chargerId: b.charger_id,
            start: b.starts_at,
            end: b.ends_at,
          }),
        ),
      checkedAt: new Date().toISOString(),
      scheduleComplete: slots.length < 200 && bookings.length < 500,
      reservationsOpen: commercialReady(),
    });
  } catch (error) {
    return failure(error, "hosts.list");
  }
}
