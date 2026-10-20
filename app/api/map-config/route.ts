import { json } from "../../lib/http";
export async function GET() {
  return json({
    browserKey: process.env.GOOGLE_MAPS_BROWSER_KEY || null,
    mapId: process.env.GOOGLE_MAPS_ID || null,
    detailsEnabled: !!process.env.GOOGLE_PLACES_API_KEY,
    routesEnabled: !!process.env.GOOGLE_ROUTES_API_KEY,
    tiles:
      process.env.MAP_TILES_URL ||
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  });
}
