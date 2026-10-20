import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""} https://maps.googleapis.com https://maps.gstatic.com https://checkout.razorpay.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.razorpay.com",
    "frame-src https://maps.google.com https://www.google.com https://*.razorpay.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "worker-src 'self'",
    ...(!dev ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  const incoming = new Headers(request.headers);
  incoming.set("x-nonce", nonce);
  incoming.set("Content-Security-Policy", csp);
  let response = NextResponse.next({ request: { headers: incoming } });
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (
    url &&
    key &&
    request.cookies.getAll().some((c) => c.name.startsWith("sb-"))
  ) {
    const client = createServerClient(url, key, {
      cookieOptions: {
        httpOnly: true,
        sameSite: "lax",
        secure: !dev,
        path: "/",
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(items) {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          incoming.set("cookie", request.headers.get("cookie") || "");
          response = NextResponse.next({ request: { headers: incoming } });
          items.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });
    try {
      await client.auth.getUser();
    } catch {
      console.error(
        JSON.stringify({
          level: "error",
          operation: "auth.refresh",
          at: new Date().toISOString(),
        }),
      );
    }
  }
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|images/).*)"],
};
