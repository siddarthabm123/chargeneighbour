import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const port = 5193,
  base = `http://localhost:${port}`;
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
  {
    env: {
      ...process.env,
      APP_URL: `https://localhost:${port}`,
      GOOGLE_PLACES_API_KEY: "",
      GOOGLE_MAPS_BROWSER_KEY: "",
      SUPABASE_URL: "",
      SUPABASE_PUBLISHABLE_KEY: "",
      SUPABASE_SECRET_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let output = "";
server.stdout.on("data", (c) => (output += c.toString()));
server.stderr.on("data", (c) => (output += c.toString()));
try {
  for (let attempt = 0; ; attempt++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    if (attempt > 100)
      throw Error("Server did not start: " + output.slice(-1000));
    await new Promise((r) => setTimeout(r, 100));
  }
  for (const path of [
    "/",
    "/privacy",
    "/terms",
    "/support",
    "/hosts",
    "/pilot",
    "/status",
    "/robots.txt",
    "/sitemap.xml",
    "/opengraph-image",
  ]) {
    const r = await fetch(base + path);
    assert.equal(r.status, 200, path);
    assert.match(r.headers.get("x-content-type-options"), /nosniff/);
    if (
      !path.includes("robots") &&
      !path.includes("sitemap") &&
      !path.includes("opengraph")
    )
      assert.match(r.headers.get("content-security-policy"), /nonce-/);
  }
  for (const path of [
    "/api/requests",
    "/api/reservations",
    "/api/operator",
    "/api/host-evidence?id=11111111-1111-4111-8111-111111111111",
  ])
    assert.equal(
      (
        await fetch(base + path, {
          headers: { "oai-authenticated-user-id": "forged" },
        })
      ).status,
      401,
      path,
    );
  const demoHome = await (await fetch(base)).text();
  assert.ok(
    demoHome.includes("Try station demo"),
    "Billing-free demo entry is present",
  );
  assert.equal(
    (await fetch(base + "/images/neighbourhood-hero.webp")).status,
    200,
    "Local demo image is available without Google billing",
  );
  const demoStatus = await (await fetch(base + "/status")).text();
  assert.ok(
    demoStatus.includes("fictional reviews"),
    "Service status labels demo content",
  );
  const callback = await fetch(
    base + "/auth/callback?next=//untrusted.invalid",
    { redirect: "manual" },
  );
  assert.equal(
    new URL(callback.headers.get("location")).host,
    `localhost:${port}`,
  );
  const other = await fetch(base + "/api/chargers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "https://untrusted.invalid",
    },
    body: "{}",
  });
  assert.equal(other.status, 403);
  const routeRequest = (body, origin = base) =>
    fetch(base + "/api/routes", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await routeRequest({}, "https://untrusted.invalid")).status,
    403,
  );
  assert.equal(
    (
      await routeRequest({
        origin: { latitude: 999, longitude: 77 },
        destinations: [],
      })
    ).status,
    400,
  );
  assert.equal((await routeRequest({ padding: "x".repeat(5100) })).status, 413);
  assert.equal(
    (
      await fetch(base + "/api/host-evidence", {
        method: "POST",
        body: new FormData(),
      })
    ).status,
    401,
  );
  const locationPost = (body, origin = base) =>
    fetch(base + "/api/location", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await locationPost({}, "https://untrusted.invalid")).status,
    403,
  );
  assert.equal(
    (await locationPost({ latitude: "12", longitude: 77 })).status,
    400,
  );
  assert.equal(
    (
      await locationPost({
        latitude: 12,
        longitude: 77,
        padding: "x".repeat(600),
      })
    ).status,
    413,
  );
  const large = await fetch(base + "/api/chargers", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: base },
    body: JSON.stringify({
      latitude: 1,
      longitude: 1,
      padding: "x".repeat(600),
    }),
  });
  assert.equal(large.status, 413);
  assert.equal((await fetch(base + "/api/chargers?q=Bengaluru")).status, 503);
  assert.equal(
    (await fetch(base + "/api/chargers/photo?name=../secret")).status,
    400,
  );
  const webhook = await fetch(base + "/api/payments/webhook", {
    method: "POST",
    body: "{}",
  });
  assert.equal(webhook.status, 503);
  assert.equal((await fetch(base + "/api/maintenance")).status, 401);
  const map = await (await fetch(base + "/api/map-config")).json();
  assert.equal(map.browserKey, null);
  console.log(
    "PASS: production HTTP pages, share image, indexing metadata, security headers, private routes, forged identity rejection, callback safety, bounded/origin-checked location requests and disabled unconfigured services.",
  );
} finally {
  server.kill();
}
