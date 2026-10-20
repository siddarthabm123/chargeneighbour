import { authClient, getCurrentUser } from "../../auth/server";
import {
  failure,
  HttpError,
  json,
  readJson,
  sameOrigin,
  textField,
  uuid,
} from "../../lib/http";
import { protect } from "../../lib/rate-limit";
import { rpc, serviceRest } from "../../../db/server";

export async function GET(request: Request) {
  try {
    if (!(await getCurrentUser()))
      throw new HttpError(401, "Sign in to see your activity.");
    const client = await authClient();
    if (!client) throw Error();
    const cursor = new URL(request.url).searchParams.get("cursor");
    let query = client
      .from("marketplace_requests")
      .select("id,kind,status,created_at,payload,operator_reply")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(26);
    if (cursor) {
      let stamp: string, id: string;
      try {
        [stamp, id] = JSON.parse(Buffer.from(cursor, "base64url").toString());
      } catch {
        throw new HttpError(400, "Invalid page.");
      }
      if (
        !uuid(id) ||
        !/^\d{4}-\d\d-\d\dT[\d:.]+[+Z-][\d:]*$/.test(stamp) ||
        !Number.isFinite(Date.parse(stamp))
      )
        throw new HttpError(400, "Invalid page.");
      query = query.or(
        `created_at.lt.${stamp},and(created_at.eq.${stamp},id.lt.${id})`,
      );
    }
    const { data, error } = await query;
    if (error) throw error;
    const page = (data || []).slice(0, 25),
      last = page.at(-1);
    return json({
      requests: page.map((r) => ({
        id: r.id,
        kind: r.kind,
        status: r.status,
        createdAt: r.created_at,
        payload: r.payload,
        reply: r.operator_reply,
      })),
      nextCursor:
        data?.length === 26 && last
          ? Buffer.from(JSON.stringify([last.created_at, last.id])).toString(
              "base64url",
            )
          : null,
    });
  } catch (error) {
    return failure(error, "requests.list");
  }
}
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Please sign in to save your request.");
    sameOrigin(request);
    await protect(request, `application:${user.id}`, 12, 600);
    const body = await readJson(request),
      kind = body.kind,
      key = request.headers.get("idempotency-key");
    if (!uuid(key))
      throw new HttpError(
        400,
        "A valid submission key is required. Please refresh the form.",
      );
    let payload: Record<string, unknown>;
    if (kind === "host") {
      if (!uuid(body.evidenceId))
        throw new HttpError(
          400,
          "Upload a charger photo with a fresh on-site GPS capture before applying.",
        );
      const evidence = await (
        await serviceRest(
          `host_evidence?id=eq.${body.evidenceId}&user_id=eq.${user.id}&limit=1`,
        )
      ).json();
      if (
        !evidence[0] ||
        Date.now() - Date.parse(evidence[0].created_at) > 1800000
      )
        throw new HttpError(
          400,
          "Upload fresh photo/GPS evidence for your own account.",
        );
      const name = textField(body.name, 2, 80),
        area = textField(body.area, 2, 80),
        access = textField(body.access, 2, 100),
        power = textField(body.power, 1, 10);
      if (
        !["3.3", "7.2", "11", "22"].includes(power) ||
        ![
          "Independent driveway",
          "Commercial parking",
          "Apartment with written permission",
        ].includes(access) ||
        body.permission !== true
      )
        throw new HttpError(
          400,
          "Complete all fields and confirm your permission to offer access.",
        );
      payload = {
        name,
        area,
        power,
        access,
        permission: true,
        connector: "Type 2 AC",
        evidenceId: body.evidenceId,
      };
    } else if (kind === "interest") {
      const area = textField(body.area, 2, 80),
        role = textField(body.role, 1, 20);
      if (
        !["driver", "host", "partner"].includes(role) ||
        body.consent !== true
      )
        throw new HttpError(
          400,
          "Choose your role and confirm contact consent.",
        );
      payload = { area, role, consent: true };
    } else if (kind === "support" || kind === "deletion") {
      const subject = textField(body.subject, 3, 120),
        message = textField(body.message, 10, 3000);
      payload = { subject, message, consent: true };
    } else
      throw new HttpError(
        kind === "booking" ? 409 : 400,
        kind === "booking"
          ? "Use the verified host reservation flow. Public Google stations cannot be reserved through ChargeNeighbour."
          : "Unsupported request.",
      );
    const client = await authClient();
    if (!client) throw Error();
    const { data, error } = await client
      .rpc("submit_marketplace_request", {
        p_kind: kind,
        p_payload: payload,
        p_key: key,
      })
      .single<{ id: string; status: string }>();
    if (error) {
      if (error.code === "P0001")
        throw new HttpError(
          429,
          "Your previous request was saved. Wait ten seconds before a new submission.",
        );
      throw error;
    }
    const source = /^[a-z0-9_-]{1,64}$/.test(String(body.source))
      ? String(body.source)
      : "direct";
    if (
      (kind === "host" || kind === "interest") &&
      /(?:^|;\s*)cn_analytics=yes(?:;|$)/.test(
        request.headers.get("cookie") || "",
      )
    )
      await rpc("count_saved_application", {
        p_id: data.id,
        p_source: source,
      }).catch(() => {});
    return json({ id: data.id, status: data.status }, 201);
  } catch (error) {
    return failure(error, "requests.submit");
  }
}
export async function PATCH(request: Request) {
  try {
    if (!(await getCurrentUser())) throw new HttpError(401, "Please sign in.");
    sameOrigin(request);
    const body = await readJson(request, 300);
    if (!uuid(body.id)) throw new HttpError(400, "Invalid record.");
    const client = await authClient();
    if (!client) throw Error();
    const { data, error } = await client
      .from("marketplace_requests")
      .update({ status: "cancelled" })
      .eq("id", body.id)
      .select("id");
    if (error) throw error;
    if (!data.length) throw new HttpError(404, "Record not found.");
    return json({ ok: true });
  } catch (error) {
    return failure(error, "requests.withdraw");
  }
}
