import { failure, HttpError, json, readJson, sameOrigin } from "../../lib/http";
import { openAddress } from "../../lib/photon-server";
import { validPoint } from "../../lib/stations";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const point = await readJson(request, 500);
    if (!validPoint(point))
      throw new HttpError(400, "A valid location is required.");
    return json({
      address: await openAddress(request, point),
      source: "OpenStreetMap via Photon",
      approximate: true,
    });
  } catch (error) {
    return failure(error, "location.address");
  }
}
