import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { serviceRest } from "../../../db/server";
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
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await protect(request, "support", 3, 3600);
    const body = await readJson(request, 5000);
    if (body.website)
      throw new HttpError(
        400,
        "Please leave the optional website field empty.",
      );
    const email = textField(body.email, 3, 254),
      subject = textField(body.subject, 3, 120),
      message = textField(body.message, 10, 3000);
    if (
      !/^\S+@\S+\.\S+$/.test(email) ||
      !["help", "privacy", "incident"].includes(String(body.category)) ||
      body.consent !== true
    )
      throw new HttpError(400, "Provide a valid email, category and consent.");
    const token = randomBytes(32).toString("base64url"),
      id = crypto.randomUUID();
    await serviceRest("support_tickets", {
      method: "POST",
      body: JSON.stringify({
        id,
        token_hash: hash(token),
        email,
        subject,
        message,
        category: body.category,
      }),
    });
    return json({ id, token }, 201);
  } catch (error) {
    return failure(error, "support.create");
  }
}
export async function GET(request: Request) {
  try {
    await protect(request, "support-read", 30, 600);
    const id = new URL(request.url).searchParams.get("id"),
      token = request.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!uuid(id) || !token || token.length !== 43)
      throw new HttpError(404, "Ticket not found.");
    const rows = await (
      await serviceRest(
        `support_tickets?id=eq.${id}&select=id,token_hash,subject,message,reply,status,created_at,updated_at`,
      )
    ).json();
    const ticket = rows[0];
    if (
      !ticket ||
      !timingSafeEqual(
        Buffer.from(ticket.token_hash, "hex"),
        Buffer.from(hash(token), "hex"),
      )
    )
      throw new HttpError(404, "Ticket not found.");
    const { token_hash, ...publicTicket } = ticket;
    return json(publicTicket);
  } catch (error) {
    return failure(error, "support.read");
  }
}
