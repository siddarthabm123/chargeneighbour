import { failure, HttpError, json } from "../../../lib/http";
import {
  useGoogleAllowance,
  signedPhotos,
} from "../../../lib/google-places-server";
import { stationFromGoogle } from "../../../lib/stations";
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !/^[A-Za-z0-9_-]{1,200}$/.test(id))
      throw new HttpError(400, "Invalid place.");
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) throw new HttpError(503, "Station details are not active yet.");
    await useGoogleAllowance(request, "detail");
    const fields =
      "id,displayName,formattedAddress,googleMapsUri,location,businessStatus,attributions,evChargeOptions,currentOpeningHours,nationalPhoneNumber,websiteUri,rating,userRatingCount,reviews,photos,googleMapsLinks";
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${id}`,
      {
        headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": fields },
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
      },
    );
    if (!response.ok)
      throw new HttpError(
        502,
        "Station details are unavailable. Open its Google Maps page.",
      );
    const station = stationFromGoogle(await response.json());
    if (!station)
      throw new HttpError(502, "No usable station details were supplied.");
    return json({ station: signedPhotos(station) });
  } catch (error) {
    return failure(error, "google.detail");
  }
}
