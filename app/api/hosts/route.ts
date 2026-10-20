import { serviceRest } from "../../../db/server";
import { failure, json } from "../../lib/http";
import { commercialReady } from "../../lib/settings";
export async function GET() {
  try {
    const chargers = await (
      await serviceRest(
        "host_chargers?status=eq.approved&select=id,name,area,latitude,longitude,power_kw,price_paise_kwh,access_notes,photos,verified_at&order=verified_at.desc&limit=50",
      )
    ).json();
    const slots = chargers.length
      ? await (
          await serviceRest(
            `host_slots?charger_id=in.(${chargers.map((c: { id: string }) => c.id).join(",")})&ends_at=gt.${new Date().toISOString()}&select=id,charger_id,starts_at,ends_at&order=starts_at.asc&limit=200`,
          )
        ).json()
      : [];
    return json({ chargers, slots, reservationsOpen: commercialReady() });
  } catch (error) {
    return failure(error, "hosts.list");
  }
}
