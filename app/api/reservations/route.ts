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
    return json({ bookings, locations });
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
    const reservation = await rpc<Reservation>("reserve_host", {
      p_driver: user.userId,
      p_charger: b.chargerId,
      p_start: b.start,
      p_end: b.end,
      p_key: key,
    });
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
    if (!uuid(b.id) || !["cancel", "refund_request"].includes(String(b.action)))
      throw new HttpError(400, "Invalid action.");
    const rows = await (
      await serviceRest(
        `reservations?id=eq.${b.id}&driver_id=eq.${encodeURIComponent(user.userId)}&select=id`,
      )
    ).json();
    if (!rows.length) throw new HttpError(404, "Reservation not found.");
    const reservation = await rpc("operate_reservation", {
      p_id: b.id,
      p_actor: user.userId,
      p_action: b.action,
      p_note: "Requested by driver",
    });
    return json({ reservation });
  } catch (error) {
    return failure(error, "reservations.change");
  }
}
