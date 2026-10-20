import "server-only";
import { createHmac } from "node:crypto";
import { rpc } from "../../db/server";
import { HttpError } from "./http";

export function clientBucket(request: Request, scope: string) {
  const key = process.env.RATE_LIMIT_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!key)
    throw new HttpError(503, "Request protection is temporarily unavailable.");
  const ip =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${scope}:${createHmac("sha256", key)
    .update(`${new Date().toISOString().slice(0, 10)}:${ip}`)
    .digest("hex")}`;
}
export async function allowance(
  bucket: string,
  limit: number,
  seconds: number,
) {
  return rpc<boolean>("take_allowance", {
    p_bucket: bucket,
    p_limit: limit,
    p_seconds: seconds,
  });
}
export async function protect(
  request: Request,
  scope: string,
  limit = 20,
  seconds = 600,
) {
  if (!(await allowance(clientBucket(request, scope), limit, seconds)))
    throw new HttpError(429, "Too many requests. Please wait and try again.");
}
