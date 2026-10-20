import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function authConfig() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".supabase.co") ||
    (!key.startsWith("sb_publishable_") && !key.startsWith("eyJ"))
  )
    throw Error("Invalid authentication configuration");
  return { url, key };
}
export async function authClient() {
  const config = authConfig();
  if (!config) return null;
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
    cookies: {
      getAll: () => jar.getAll(),
      setAll(items) {
        try {
          items.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
        } catch {
          /* Proxy refreshes cookies before rendering Server Components. */
        }
      },
    },
  });
}
export async function getCurrentUser() {
  const jar = await cookies();
  if (!jar.getAll().some((c) => c.name.startsWith("sb-"))) return null;
  const client = await authClient();
  if (!client) return null;
  try {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user?.email) return null;
    const user = data.user;
    const isOperator =
      user.app_metadata?.role === "operator" ||
      (process.env.ADMIN_USER_IDS || "")
        .split(",")
        .map((id) => id.trim())
        .includes(user.id);
    return {
      userId: `supabase:${user.id}`,
      id: user.id,
      email: user.email!,
      isOperator,
      displayName:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : user.email!,
    };
  } catch {
    console.error(
      JSON.stringify({
        level: "error",
        operation: "auth.verify",
        at: new Date().toISOString(),
      }),
    );
    return null;
  }
}
export function safeNext(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  )
    return "/?action=activity";
  try {
    const url = new URL(value, "https://app.invalid");
    return url.origin === "https://app.invalid" &&
      !url.pathname.startsWith("/auth/")
      ? url.pathname + url.search + url.hash
      : "/?action=activity";
  } catch {
    return "/?action=activity";
  }
}
export function appOrigin() {
  const value =
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:5180");
  const url = new URL(value);
  if (
    url.protocol !== "https:" &&
    !(process.env.NODE_ENV !== "production" && url.hostname === "localhost")
  )
    throw Error("Invalid site URL");
  return url.origin;
}
