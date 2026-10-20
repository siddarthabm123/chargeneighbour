import "server-only";
import { HttpError } from "../app/lib/http";

export async function serviceRest(path: string, options: RequestInit = {}) {
  const base = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(base))
    throw new HttpError(503, "The service is temporarily unavailable.");
  const headers = new Headers(options.headers);
  headers.set("apikey", key);
  headers.set("Content-Type", "application/json");
  if (key.startsWith("eyJ")) headers.set("Authorization", `Bearer ${key}`);
  const response = await fetch(new URL(`/rest/v1/${path}`, base), {
    ...options,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      code?: string;
    };
    if (error.code === "23P01")
      throw new HttpError(
        409,
        "That time is no longer available. Choose another slot.",
      );
    if (error.code === "P0001")
      throw new HttpError(
        409,
        "This action is no longer available. Refresh and try again.",
      );
    throw Error(`Database operation failed: ${response.status}`);
  }
  return response;
}
export async function rpc<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await serviceRest(`rpc/${name}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (response.status === 204) return null as T;
  const value = await response.json();
  return (Array.isArray(value) && value.length === 1 ? value[0] : value) as T;
}
