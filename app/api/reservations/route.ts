import { authClient, getCurrentUser } from "../../auth/server";
import { rpc, serviceRest } from "../../../db/server";
import {
  failure,
  HttpError,
  json,
  readJson,
  sameOrigin,
  uuid,
} from "../../lib/http";
import { protect } from "../../lib/rate-limit";
import { commercialReady } from "../../lib/settings";
import type { Reservation } from "../../lib/reservations";
import { mayManageBooking, validVehicle } from "../../lib/charger-choice";
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Please sign in.");
    const client = await authClient();
    if (!client) throw Error();
    const { data, error } = await client
      .from("reservations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    const bookings = (data || []) as Reservation[];
    const locations: Record<string, unknown> = {};
    for (const r of bookings.filter((b) =>
      ["confirmed", "in_progress", "completed"].includes(b.status),
    )) {
      if (!locations[r.charger_id])
        locations[r.charger_id] = (
          await (
            await serviceRest(
              `host_locations?charger_id=eq.${r.charger_id}&select=address,latitude,longitude`,
            )
          ).json()
        )[0];
    }
    const owned = await (
      await serviceRest(
        `host_chargers?owner_id=eq.${encodeURIComponent(user.userId)}&select=id&limit=50`,
      )
    ).json();
    return json({
      bookings,
      locations,
      managedChargerIds: owned.map((c: { id: string }) => c.id),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return failure(error, "reservations.list");
  }
}
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Please sign in.");
    sameOrigin(request);
    if (!commercialReady())
      throw new HttpError(
        409,
        "Commercial reservations are not open. You can register pilot interest.",
      );
    await protect(request, `reservation:${user.id}`, 5, 3600);
    const b = await readJson(request, 1000),
      key = request.headers.get("idempotency-key");
    if (
      !uuid(b.chargerId) ||
      !uuid(key) ||
      b.acceptTerms !== true ||
      typeof b.start !== "string" ||
      typeof b.end !== "string" ||
      !Number.isFinite(Date.parse(b.start)) ||
      !Number.isFinite(Date.parse(b.end))
    )
      throw new HttpError(
        400,
        "Choose a charger, valid times and accept the published terms.",
      );
    if (
      !validVehicle(b.vehicleConnections) ||
      !b.vehicleConnections.includes("TYPE_2")
    )
      throw new HttpError(
        400,
        "This host offers Type 2 AC. Select that connection only if your vehicle supports it.",
      );
    if (
      !Number.isInteger(b.expectedRatePaise) ||
      Number(b.expectedRatePaise) <= 0
    )
      throw new HttpError(
        400,
        "Review the published energy rate before requesting a time.",
      );
    const listing = (
      await (
        await serviceRest(
          `host_chargers?id=eq.${b.chargerId}&status=eq.approved&select=price_paise_kwh,checks&limit=1`,
        )
      ).json()
    )[0];
    if (!listing || listing.checks?.pricing !== true)
      throw new HttpError(
        409,
        "The operator must confirm the all-in price before this charger can accept bookings.",
      );
    if (listing.price_paise_kwh !== b.expectedRatePaise)
      throw new HttpError(
        409,
        "The price changed. Refresh chargers and review your existing sessions before trying again.",
      );
    const reservation = await rpc<Reservation>("reserve_host", {
      p_driver: user.userId,
      p_charger: b.chargerId,
      p_start: b.start,
      p_end: b.end,
      p_key: key,
    });
    if (reservation.rate_paise_kwh !== b.expectedRatePaise) {
      if (["requested", "confirmed"].includes(reservation.status))
        await rpc("operate_reservation", {
          p_id: reservation.id,
          p_actor: user.userId,
          p_action: "cancel",
          p_note:
            "Price changed during request; driver must review a new quote",
        });
      throw new HttpError(
        409,
        "The price changed during the request. Review your sessions, refresh the price and submit again. No automatic payment is taken.",
      );
    }
    return json({ reservation }, 201);
  } catch (error) {
    return failure(error, "reservations.create");
  }
}
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Please sign in.");
    sameOrigin(request);
    const b = await readJson(request, 500);
    if (
      !uuid(b.id) ||
      !["cancel", "refund_request", "confirm", "decline"].includes(
        String(b.action),
      )
    )
      throw new HttpError(400, "Invalid action.");
    const rows = await (
      await serviceRest(
        `reservations?id=eq.${b.id}&select=id,driver_id,charger_id`,
      )
    ).json();
    if (!rows.length) throw new HttpError(404, "Reservation not found.");
    const hostAction = b.action === "confirm" || b.action === "decline";
    if (hostAction) {
      const host = (
        await (
          await serviceRest(
            `host_chargers?id=eq.${rows[0].charger_id}&select=owner_id,status&limit=1`,
          )
        ).json()
      )[0];
      if (!mayManageBooking(user.userId, host?.owner_id))
        throw new HttpError(404, "Reservation not found for this account.");
      if (
        b.action === "confirm" &&
        (!commercialReady() || host.status !== "approved")
      )
        throw new HttpError(
          409,
          "This charger is not accepting commercial confirmations.",
        );
    } else if (rows[0].driver_id !== user.userId)
      throw new HttpError(404, "Reservation not found for this account.");
    const reservation = await rpc("operate_reservation", {
      p_id: b.id,
      p_actor: user.userId,
      p_action: b.action === "decline" ? "cancel" : b.action,
      p_note: hostAction
        ? "Confirmed or declined by verified host owner"
        : "Requested by driver",
    });
    return json({ reservation });
  } catch (error) {
    return failure(error, "reservations.change");
  }
}
