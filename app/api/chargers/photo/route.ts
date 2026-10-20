import { failure, HttpError } from "../../../lib/http";
import {
  useGoogleAllowance,
  validPhotoAccess,
} from "../../../lib/google-places-server";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams,
      name = params.get("name") || "";
    if (
      name.length > 2000 ||
      !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(name)
    )
      throw new HttpError(400, "Invalid photo reference.");
    if (!process.env.GOOGLE_PLACES_API_KEY)
      throw new HttpError(503, "Google photos are not active yet.");
    if (
      !validPhotoAccess(
        name,
        params.get("expires") || "",
        params.get("signature") || "",
      )
    )
      throw new HttpError(
        403,
        "This photo link expired. Reopen the station for current photos.",
      );
    await useGoogleAllowance(request, "photo");
    const response = await fetch(
      `https://places.googleapis.com/v1/${name}/media?maxWidthPx=900&skipHttpRedirect=true`,
      {
        headers: { "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY },
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
      },
    );
    if (!response.ok)
      throw new HttpError(502, "Photo unavailable. View it on Google Maps.");
    const data = (await response.json()) as { photoUri?: string },
      url = new URL(data.photoUri || "");
    if (
      url.protocol !== "https:" ||
      !(
        url.hostname === "googleusercontent.com" ||
        url.hostname.endsWith(".googleusercontent.com")
      )
    )
      throw Error("Invalid image host");
    return new Response(null, {
      status: 302,
      headers: { Location: url.href, "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return failure(error, "google.photo");
  }
}
