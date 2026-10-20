import { timingSafeEqual } from "node:crypto";
import { rpc } from "../../../db/server";
import { failure, HttpError, json } from "../../lib/http";
export async function GET(request: Request) {
  try {
    const expected = process.env.CRON_SECRET,
      actual = request.headers.get("authorization")?.replace(/^Bearer /, "");
    if (
      !expected ||
      !actual ||
      expected.length !== actual.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
    )
      throw new HttpError(401, "Unauthorized.");
    await rpc("cleanup_pilot_data", {});
    return json({ ok: true });
  } catch (error) {
    return failure(error, "maintenance.cleanup");
  }
}
