import { json, failure, HttpError, readJson, sameOrigin } from "../../lib/http";
import {
  useGoogleAllowance,
  signedPhotos,
} from "../../lib/google-places-server";
import { validPoint, stationFromGoogle, type Point } from "../../lib/stations";
import { nearbyOpenStations, openSearchPoint } from "../../lib/photon-server";
async function search(request: Request, query: string, point?: Point) {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    const center = point || (await openSearchPoint(request, query));
    if (!center || !validPoint(center))
      return json({
        stations: [],
        message:
          "No mapped location was found. Try a nearby city or use your location.",
      });
    return json({
      stations: await nearbyOpenStations(request, center),
      source: "openstreetmap",
      message:
        "Nearby stations from OpenStreetMap. Coverage may be incomplete; opening hours and live connector availability are unconfirmed. Open Google Maps for photos and operator details.",
      fetchedAt: new Date().toISOString(),
    });
  }
  await useGoogleAllowance(request, "search");
  const fieldMask =
    "places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.location,places.businessStatus,places.attributions,places.evChargeOptions";
  const body = point
    ? {
        includedTypes: ["electric_vehicle_charging_station"],
        maxResultCount: 20,
        rankPreference: "DISTANCE",
        locationRestriction: { circle: { center: point, radius: 25000 } },
        languageCode: "en",
      }
    : {
        textQuery: `Electric vehicle charging stations near ${query}, India`,
        includedType: "electric_vehicle_charging_station",
        strictTypeFiltering: true,
        regionCode: "IN",
        languageCode: "en",
        pageSize: 20,
      };
  const response = await fetch(
    `https://places.googleapis.com/v1/places:${point ? "searchNearby" : "searchText"}`,
    {
      method: "POST",
      signal: AbortSignal.timeout(12000),
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new HttpError(
      502,
      "Detailed station information is unavailable. Continue in Google Maps or contact the operator.",
    );
  const data = (await response.json()) as {
    places?: Parameters<typeof stationFromGoogle>[0][];
  };
  return json({
    stations: (data.places || [])
      .map(stationFromGoogle)
      .filter((s) => s !== null)
      .map(signedPhotos),
    fetchedAt: new Date().toISOString(),
  });
}
export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim() || "";
    if (q.length < 2 || q.length > 120)
      throw new HttpError(
        400,
        "Enter a city, neighbourhood or PIN code between 2 and 120 characters.",
      );
    return await search(request, q);
  } catch (error) {
    return failure(error, "google.search");
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await readJson(request, 500);
    if (!validPoint(body))
      throw new HttpError(400, "A valid latitude and longitude are required.");
    return await search(request, "", {
      latitude: body.latitude,
      longitude: body.longitude,
    });
  } catch (error) {
    return failure(error, "google.nearby");
  }
}
