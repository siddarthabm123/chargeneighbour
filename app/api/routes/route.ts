import { allowance, protect } from "../../lib/rate-limit";
import { useGoogleAllowance } from "../../lib/google-places-server";
import {
  boundedText,
  failure,
  HttpError,
  json,
  readJson,
  sameOrigin,
} from "../../lib/http";
import { distanceKm, validPoint, type Point } from "../../lib/stations";
import { decodePolyline, validRoadMetric } from "../../lib/road-route";
type Destination = { id: string; location: Point };
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await readJson(request, 5000),
      origin = body.origin;
    if (
      !validPoint(origin) ||
      !Array.isArray(body.destinations) ||
      !body.destinations.length ||
      body.destinations.length > 20
    )
      throw new HttpError(
        400,
        "Choose your current location and up to 20 nearby destinations.",
      );
    const destinations = body.destinations as Destination[];
    if (
      !destinations.every(
        (d) =>
          !!d &&
          typeof d.id === "string" &&
          d.id.length <= 200 &&
          validPoint(d.location) &&
          distanceKm(origin, d.location) <= 100,
      )
    )
      throw new HttpError(400, "Choose valid stations within 100 km.");
    if (body.detailed === true && destinations.length !== 1)
      throw new HttpError(400, "Choose one station for route directions.");
    await protect(request, "road-routes", 12, 600);
    const google = body.source === "google";
    if (
      google &&
      (!process.env.GOOGLE_ROUTES_API_KEY ||
        !process.env.GOOGLE_MAPS_BROWSER_KEY ||
        !process.env.GOOGLE_MAPS_ID)
    )
      throw new HttpError(
        503,
        "Google driving routes need activation. No estimated straight-line distance is substituted.",
      );
    const detailed = body.detailed === true,
      stamp = new Date().toISOString();
    if (google) {
      await useGoogleAllowance(request, "route");
      const waypoint = (p: Point) => ({ location: { latLng: p } });
      const response = await fetch(
        detailed
          ? "https://routes.googleapis.com/directions/v2:computeRoutes"
          : "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": process.env.GOOGLE_ROUTES_API_KEY!,
            "X-Goog-FieldMask": detailed
              ? "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters"
              : "originIndex,destinationIndex,distanceMeters,duration,condition,status",
          },
          body: JSON.stringify(
            detailed
              ? {
                  origin: waypoint(origin),
                  destination: waypoint(destinations[0].location),
                  travelMode: "DRIVE",
                  routingPreference: "TRAFFIC_UNAWARE",
                }
              : {
                  origins: [{ waypoint: waypoint(origin) }],
                  destinations: destinations.map((d) => ({
                    waypoint: waypoint(d.location),
                  })),
                  travelMode: "DRIVE",
                  routingPreference: "TRAFFIC_UNAWARE",
                },
          ),
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok)
        throw new HttpError(
          503,
          "Google driving routes are unavailable. Please retry.",
        );
      const data = JSON.parse(await boundedText(response, 2000000));
      if (!detailed)
        return json({
          metrics: Object.fromEntries(
            data
              .filter(
                (r: { condition: string }) => r.condition === "ROUTE_EXISTS",
              )
              .map(
                (r: {
                  destinationIndex: number;
                  distanceMeters: number;
                  duration: string;
                }) => [
                  destinations[r.destinationIndex]?.id,
                  {
                    distanceMeters: r.distanceMeters,
                    durationSeconds: parseFloat(r.duration),
                  },
                ],
              ),
          ),
          provider: "google",
          calculatedAt: stamp,
        });
      const r = data.routes?.[0];
      if (!r) throw new HttpError(404, "No driving route was found.");
      return json({
        route: {
          provider: "google",
          distanceMeters: r.distanceMeters,
          durationSeconds: parseFloat(r.duration),
          coordinates: decodePolyline(r.polyline.encodedPolyline),
          steps: (r.legs || []).flatMap(
            (l: {
              steps?: {
                navigationInstruction?: { instructions: string };
                distanceMeters: number;
              }[];
            }) =>
              (l.steps || []).map((s) => ({
                text: s.navigationInstruction?.instructions || "Continue",
                distanceMeters: s.distanceMeters,
              })),
          ),
          calculatedAt: stamp,
          origin,
        },
      });
    }
    if (!(await allowance("osrm:global", 1, 1))) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
      if (!(await allowance("osrm:global", 1, 1)))
        throw new HttpError(
          429,
          "A route request is in progress. Try again in a moment.",
        );
    }
    if (!(await allowance(`osrm:daily:${stamp.slice(0, 10)}`, 150, 86400)))
      throw new HttpError(429, "Today’s pilot route allowance is reached.");
    const points = [origin, ...destinations.map((d) => d.location)]
      .map((p) => `${p.longitude},${p.latitude}`)
      .join(";");
    const base = new URL(
      process.env.OSRM_BASE_URL ||
        "https://routing.openstreetmap.de/routed-car/",
    );
    if (base.protocol !== "https:") throw Error("Invalid routing host");
    const url = new URL(
      `${detailed ? "route" : "table"}/v1/driving/${points}`,
      base.href.endsWith("/") ? base : new URL(base.href + "/"),
    );
    url.search = detailed
      ? "steps=true&geometries=geojson&overview=full&alternatives=false"
      : `sources=0&destinations=${destinations.map((_, i) => i + 1).join(";")}&annotations=distance,duration`;
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "ChargeNeighbour/1.0 (+https://chargeneighbour-theta.vercel.app/support)",
        Referer: "https://chargeneighbour-theta.vercel.app/",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new HttpError(
        503,
        "Driving-route lookup is busy. Please try again.",
      );
    const data = JSON.parse(await boundedText(response, 2000000));
    if (data.code !== "Ok")
      throw new HttpError(
        404,
        "No mapped driving route was found for this location.",
      );
    const snap = data.waypoints || [
      data.sources?.[0],
      ...(data.destinations || []),
    ];
    if (
      snap.some(
        (s: { distance?: number } | null) => !s || Number(s.distance) > 500,
      )
    )
      throw new HttpError(
        404,
        "This location is too far from a mapped driving road. Confirm the station entrance.",
      );
    if (!detailed)
      return json({
        metrics: Object.fromEntries(
          destinations.flatMap((d, i) => {
            const m = {
              distanceMeters: data.distances?.[0]?.[i],
              durationSeconds: data.durations?.[0]?.[i],
            };
            return validRoadMetric(m) ? [[d.id, m]] : [];
          }),
        ),
        provider: "osrm",
        calculatedAt: stamp,
      });
    const r = data.routes?.[0],
      metric = { distanceMeters: r?.distance, durationSeconds: r?.duration };
    if (!validRoadMetric(metric))
      throw new HttpError(404, "No usable driving route was found.");
    const steps = (r.legs || []).flatMap(
      (l: {
        steps?: {
          name?: string;
          distance: number;
          maneuver: { type: string; modifier?: string };
        }[];
      }) =>
        (l.steps || []).map((s) => ({
          text: `${s.maneuver.type.replaceAll("_", " ")}${s.maneuver.modifier ? ` ${s.maneuver.modifier}` : ""}${s.name ? ` · ${s.name}` : ""}`,
          distanceMeters: s.distance,
        })),
    );
    return json({
      route: {
        ...metric,
        provider: "osrm",
        coordinates: r.geometry.coordinates,
        steps,
        calculatedAt: stamp,
        origin,
      },
    });
  } catch (error) {
    return failure(error, "road.route");
  }
}
