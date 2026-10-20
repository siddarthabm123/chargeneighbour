import { NextResponse } from "next/server";
import { authClient, safeNext, appOrigin } from "../server";
export async function GET(request: Request) {
  const url = new URL(request.url),
    code = url.searchParams.get("code"),
    next = safeNext(url.searchParams.get("next"));
  const client = await authClient();
  if (code && code.length < 3000 && client) {
    const flow = url.searchParams.get("sb_flow_id");
    let verified = false;
    try {
      const { error } = await client.auth.exchangeCodeForSession(
        code,
        flow ? { flowId: flow } : undefined,
      );
      verified = !error;
    } catch {
      console.error(
        JSON.stringify({
          level: "error",
          operation: "auth.callback",
          at: new Date().toISOString(),
        }),
      );
    }
    if (verified)
      return NextResponse.redirect(new URL(next, appOrigin()), {
        headers: { "Cache-Control": "private, no-store" },
      });
  }
  return NextResponse.redirect(
    new URL(
      `/auth/login?status=callback&next=${encodeURIComponent(next)}`,
      appOrigin(),
    ),
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
