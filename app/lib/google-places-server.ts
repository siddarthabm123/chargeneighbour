import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError, json } from "./http";
import { allowance, protect } from "./rate-limit";
import type { Station } from "./stations";
export const privateJson = json;
export async function useGoogleAllowance(request: Request, scope: string) {
  await protect(request, `google-${scope}`, scope === "photo" ? 24 : 12, 600);
  if (
    !(await allowance(
      `google:daily-total:${new Date().toISOString().slice(0, 10)}`,
      100,
      86400,
    ))
  )
    throw new HttpError(
      429,
      "Today’s station-detail allowance has been reached. Continue in Google Maps.",
    );
}
function photoSecret() {
  const key = process.env.RATE_LIMIT_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!key) throw Error("Photo protection unavailable");
  return key;
}
export function signedPhotos(station: Station) {
  const expires = String(Math.floor(Date.now() / 1000) + 1800);
  return {
    ...station,
    photos: station.photos.map((p) => ({
      ...p,
      url: `/api/chargers/photo?name=${encodeURIComponent(p.name)}&expires=${expires}&signature=${createHmac(
        "sha256",
        photoSecret(),
      )
        .update(p.name + ":" + expires)
        .digest("hex")}`,
    })),
  };
}
export function validPhotoAccess(
  name: string,
  expires: string,
  signature: string,
) {
  const expiry = Number(expires);
  if (
    !Number.isInteger(expiry) ||
    expiry < Math.floor(Date.now() / 1000) ||
    expiry > Math.floor(Date.now() / 1000) + 1900 ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return false;
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    createHmac("sha256", photoSecret())
      .update(name + ":" + expires)
      .digest(),
  );
}
