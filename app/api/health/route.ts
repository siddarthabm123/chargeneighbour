import { serviceRest } from "../../../db/server";
import { json } from "../../lib/http";
export async function GET() {
  let database = false;
  try {
    await serviceRest("host_chargers?select=id&limit=1");
    database = true;
  } catch {}
  return json(
    {
      status: database ? "ok" : "unavailable",
      database,
      stationDetails: !!process.env.GOOGLE_PLACES_API_KEY,
      emailReady: process.env.EMAIL_SIGNIN_READY === "true",
      checkedAt: new Date().toISOString(),
    },
    database ? 200 : 503,
  );
}
