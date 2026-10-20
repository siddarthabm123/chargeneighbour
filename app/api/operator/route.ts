import { getCurrentUser } from "../../auth/server";
import { rpc, serviceRest } from "../../../db/server";
import {
  failure,
  HttpError,
  json,
  readJson,
  sameOrigin,
  textField,
  uuid,
} from "../../lib/http";
import { commercialReady, operatorDetails } from "../../lib/settings";
import { validPoint, safeWebLink, distanceKm } from "../../lib/stations";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Sign in.");
    if (!user.isOperator)
      throw new HttpError(403, "Operator access is required.");
    const params = new URL(request.url).searchParams,
      resource = params.get("resource");
    const queues: Record<string, string> = {
      applications: "marketplace_requests?",
      chargers: "host_chargers?",
      bookings: "reservations?",
      tickets:
        "support_tickets?select=id,email,category,subject,message,reply,status,created_at&",
      ledger: "session_ledger?",
      events: "operation_events?",
    };
    if (resource) {
      const page = Number(params.get("page"));
      if (
        !Object.hasOwn(queues, resource) ||
        !Number.isInteger(page) ||
        page < 1 ||
        page > 5000
      )
        throw new HttpError(400, "Invalid queue page.");
      const rows = await (
        await serviceRest(
          `${queues[resource]}order=created_at.desc&limit=50&offset=${page * 50}`,
        )
      ).json();
      return json({ rows, hasMore: rows.length === 50 });
    }
    const paths = [
      "marketplace_requests?order=created_at.desc&limit=50",
      "host_chargers?order=created_at.desc&limit=50",
      "reservations?order=created_at.desc&limit=50",
      "support_tickets?select=id,email,category,subject,message,reply,status,created_at&order=created_at.desc&limit=50",
      "funnel_daily?order=day.desc&limit=100",
      "session_ledger?order=created_at.desc&limit=50",
      "operation_events?order=created_at.desc&limit=50",
    ];
    const [applications, chargers, bookings, tickets, metrics, ledger, events] =
      await Promise.all(paths.map(async (p) => (await serviceRest(p)).json()));
    return json({
      applications,
      chargers,
      bookings,
      tickets,
      metrics,
      ledger,
      events,
      configuration: {
        google: !!process.env.GOOGLE_PLACES_API_KEY,
        map: !!process.env.GOOGLE_MAPS_BROWSER_KEY,
        email: process.env.EMAIL_SIGNIN_READY === "true",
        operator: !!operatorDetails().name,
        support: !!operatorDetails().email,
        commercial: commercialReady(),
      },
    });
  } catch (error) {
    return failure(error, "operator.read");
  }
}
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Sign in.");
    if (!user.isOperator)
      throw new HttpError(403, "Operator access is required.");
    sameOrigin(request);
    const b = await readJson(request, 14000);
    const action = b.action;
    let reference: string | undefined;
    if (action === "reply") {
      if (!uuid(b.id) || !["ticket", "application"].includes(String(b.type)))
        throw new HttpError(400, "Choose a request.");
      const reply = textField(b.reply, 2, 4000),
        table =
          b.type === "ticket" ? "support_tickets" : "marketplace_requests";
      const update =
        b.type === "ticket"
          ? { reply, status: "answered", updated_at: new Date().toISOString() }
          : { operator_reply: reply, reviewed_at: new Date().toISOString() };
      await serviceRest(`${table}?id=eq.${b.id}`, {
        method: "PATCH",
        body: JSON.stringify(update),
      });
      reference = b.id;
    } else if (action === "onboard") {
      if (!uuid(b.applicationId))
        throw new HttpError(400, "Choose the host application.");
      const applications = await (
        await serviceRest(
          `marketplace_requests?id=eq.${b.applicationId}&kind=eq.host&status=eq.pending_review`,
        )
      ).json();
      if (!applications[0])
        throw new HttpError(409, "The active host application was not found.");
      const point = {
        latitude: Number(b.latitude),
        longitude: Number(b.longitude),
      };
      if (!validPoint(point))
        throw new HttpError(400, "Enter valid site coordinates.");
      const evidenceId = applications[0].payload.evidenceId;
      if (!uuid(evidenceId))
        throw new HttpError(
          400,
          "The applicant must supply a charger photo and GPS capture before publishing.",
        );
      const capture = (
        await (
          await serviceRest(`host_evidence?id=eq.${evidenceId}&limit=1`)
        ).json()
      )[0];
      if (
        !capture ||
        distanceKm(point, {
          latitude: capture.latitude,
          longitude: capture.longitude,
        }) >
          0.2 + capture.accuracy_m / 1000
      )
        throw new HttpError(
          400,
          "The listing location does not match the applicant's GPS evidence. Resolve the site discrepancy before publishing.",
        );
      const power = Number(b.power),
        price = Number(b.pricePaise);
      if (
        ![3.3, 7.2, 11, 22].includes(power) ||
        !Number.isInteger(price) ||
        price < 100 ||
        price > 10000
      )
        throw new HttpError(
          400,
          "Check charger power and the all-in per-kWh price.",
        );
      const checks = b.checks as Record<string, unknown> | undefined;
      if (
        !checks ||
        ![
          "identity",
          "permission",
          "electrical",
          "metering",
          "access",
          "support",
        ].every((k) => checks[k] === true)
      )
        throw new HttpError(
          400,
          "Complete all actual verification steps before publishing.",
        );
      const evidence = textField(b.evidence, 20, 2000),
        address = textField(b.address, 10, 1000),
        access = textField(b.access, 10, 2000);
      if (
        !Array.isArray(b.photos) ||
        !b.photos.length ||
        b.photos.length > 6 ||
        !b.photos.every((p) => safeWebLink(p))
      )
        throw new HttpError(
          400,
          "Add one to six approved HTTPS host photo URLs.",
        );
      reference = await rpc<string>("onboard_host", {
        p_application: b.applicationId,
        p_actor: user.userId,
        p_listing: {
          name: textField(b.name, 2, 100),
          area: textField(b.area, 2, 120),
          power_kw: power,
          price_paise_kwh: price,
          access_notes: access,
          photos: b.photos,
          checks: {
            ...Object.fromEntries(
              [
                "identity",
                "permission",
                "electrical",
                "metering",
                "access",
                "support",
              ].map((k) => [k, true]),
            ),
            evidence,
          },
        },
        p_location: { address, ...point },
      });
    } else if (action === "slot") {
      if (
        !uuid(b.chargerId) ||
        typeof b.start !== "string" ||
        typeof b.end !== "string" ||
        !Number.isFinite(Date.parse(b.start)) ||
        !Number.isFinite(Date.parse(b.end)) ||
        Date.parse(b.end) <= Date.parse(b.start) ||
        Date.parse(b.end) - Date.parse(b.start) > 43200000 ||
        Date.parse(b.start) < Date.now()
      )
        throw new HttpError(
          400,
          "Choose a future offered interval up to 12 hours.",
        );
      await serviceRest("host_slots", {
        method: "POST",
        body: JSON.stringify({
          charger_id: b.chargerId,
          starts_at: b.start,
          ends_at: b.end,
        }),
      });
      reference = b.chargerId;
    } else if (action === "pause") {
      if (!uuid(b.id)) throw new HttpError(400, "Invalid charger.");
      await serviceRest(`host_chargers?id=eq.${b.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "paused" }),
      });
      reference = b.id;
    } else if (action === "session") {
      if (
        !uuid(b.id) ||
        !["confirm", "start", "finish", "cancel"].includes(String(b.transition))
      )
        throw new HttpError(400, "Invalid session action.");
      if (
        ["start", "finish"].includes(String(b.transition)) &&
        (!Number.isFinite(b.meter) || Number(b.meter) < 0)
      )
        throw new HttpError(400, "Enter the actual meter reading.");
      await rpc("operate_reservation", {
        p_id: b.id,
        p_actor: user.userId,
        p_action: b.transition,
        p_meter: b.meter ?? null,
        p_note: textField(b.note, 3, 1000),
      });
      reference = b.id;
    } else if (action === "settlement") {
      if (!uuid(b.id)) throw new HttpError(400, "Invalid session.");
      const referenceText = textField(b.reference, 5, 200);
      await serviceRest(
        `session_ledger?booking_id=eq.${b.id}&settlement_status=eq.pending`,
        {
          method: "PATCH",
          body: JSON.stringify({
            settlement_status: "settled",
            settlement_reference: referenceText,
          }),
        },
      );
      reference = b.id;
    } else if (action === "cleanup") await rpc("cleanup_pilot_data", {});
    else throw new HttpError(400, "Unsupported operator action.");
    await serviceRest("operation_events", {
      method: "POST",
      body: JSON.stringify({
        actor: user.userId,
        action: String(action),
        reference_id: reference || null,
        note: action === "settlement" ? String(b.reference) : "",
      }),
    });
    return json({ ok: true, id: reference });
  } catch (error) {
    return failure(error, "operator.write");
  }
}
