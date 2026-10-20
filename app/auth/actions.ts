"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { protect } from "../lib/rate-limit";
import { HttpError } from "../lib/http";
import { appOrigin, authClient, safeNext } from "./server";

export async function sendSignInLink(form: FormData) {
  const next = safeNext(form.get("next"));
  const email = String(form.get("email") || "").trim();
  const destination = `/auth/login?next=${encodeURIComponent(next)}`;
  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email))
    redirect(`${destination}&status=invalid`);
  if (form.get("website")) redirect(`${destination}&status=invalid`);
  let protection = "";
  try {
    await protect(
      new Request(appOrigin(), { headers: await headers() }),
      "signin",
      5,
      600,
    );
  } catch (e) {
    protection =
      e instanceof HttpError && e.status === 429 ? "limited" : "unavailable";
  }
  if (protection) redirect(`${destination}&status=${protection}`);
  const client = await authClient();
  if (!client) redirect(`${destination}&status=unavailable`);
  let result = "sent";
  try {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${appOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) result = error.status === 429 ? "limited" : "failed";
  } catch {
    result = "unavailable";
  }
  if (result !== "sent") redirect(`${destination}&status=${result}`);
  redirect(`${destination}&status=sent`);
}
export async function signOut() {
  const client = await authClient();
  let failed = false;
  try {
    if (client) {
      const { error } = await client.auth.signOut({ scope: "local" });
      failed = !!error;
    }
  } catch {
    failed = true;
  }
  redirect(failed ? "/auth/login?status=logout" : "/");
}
