import { json } from "../../lib/http";
export async function GET() {
  return json({
    browserKey: process.env.GOOGLE_MAPS_BROWSER_KEY || null,
    mapId: process.env.GOOGLE_MAPS_ID || null,
    detailsEnabled: !!process.env.GOOGLE_PLACES_API_KEY,
  });
}
