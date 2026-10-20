import { PlugZap, ArrowRight, ShieldCheck } from "lucide-react";
import { authConfig, safeNext } from "../server";
import { sendSignInLink } from "../actions";
import SubmitButton from "../../submit-button";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams,
    next = safeNext(params.next),
    configured = !!authConfig();
  const messages: Record<string, string> = {
    sent: "Check your inbox for a secure sign-in link. Open it in this browser to continue. No password is needed.",
    invalid: "Enter a valid email address.",
    limited: "Too many sign-in requests. Please wait before trying again.",
    failed: "The sign-in email could not be sent. Please try again later.",
    callback:
      "This sign-in link could not be verified. Request a new link and open it in the same browser.",
    unavailable: "Sign-in is temporarily unavailable.",
    logout: "Sign-out could not be confirmed. Retry or contact support.",
  };
  const status = typeof params.status === "string" ? params.status : "";
  return (
    <main className="auth-shell">
      <a href="/" className="brand">
        <PlugZap size={25} />
        chargeneighbour.
      </a>
      <section className="auth-card">
        <div className="eyebrow">YOUR CHARGING COMMUNITY</div>
        <h1>
          A little closer.
          <br />
          Welcome back.
        </h1>
        <p>
          Sign in with your email to apply as a host and manage your activity.
        </p>
        {messages[status] && (
          <div
            className={`auth-message ${status === "sent" ? "success" : ""}`}
            role="status"
          >
            {messages[status]}
          </div>
        )}
        {configured ? (
          <form action={sendSignInLink}>
            <label className="honeypot" aria-hidden="true">
              Leave empty
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            <input type="hidden" name="next" value={next} />
            <label htmlFor="email">Email address</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="you@example.com"
            />
            <SubmitButton label="Email me a sign-in link" />
          </form>
        ) : (
          <p role="status">
            Email sign-in is being configured. You can explore real charging
            stations without an account.
          </p>
        )}
        {process.env.EMAIL_SIGNIN_READY !== "true" && (
          <p className="notice-card">
            Email delivery is still being prepared for public use. If your link
            does not arrive, <a href="/support">contact the pilot team</a>.
          </p>
        )}
        <p className="auth-trust">
          <ShieldCheck size={18} />
          Secure email sign-in powered by Supabase. Requesting a link may create
          your account.
        </p>
        <a className="text-link" href="/#explore">
          Continue exploring stations <ArrowRight size={16} />
        </a>
      </section>
    </main>
  );
}
