import assert from "node:assert/strict";
const base = process.env.CHECK_BASE_URL || "http://localhost:5180";
const home = await fetch(base);
assert.equal(home.status, 200);
const html = await home.text();
assert.ok(html.includes("Share your"));
assert.ok(html.includes("HOME CHARGER SHARING"));
assert.ok(html.includes("maps.google.com/maps?"));
const forged = {
  "oai-authenticated-user-id": "forged-user",
  "oai-authenticated-user-email": "forged@example.invalid",
};
assert.equal(
  (await fetch(base + "/api/requests", { headers: forged })).status,
  401,
);
assert.equal(
  (
    await fetch(base + "/api/requests", {
      method: "POST",
      headers: { ...forged, origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "host" }),
    })
  ).status,
  401,
);
const callback = await fetch(
  base + "/auth/callback?next=" + encodeURIComponent("//untrusted.example"),
  { redirect: "manual" },
);
assert.equal(callback.status, 307);
const destination = new URL(callback.headers.get("location"));
assert.equal(destination.pathname, "/auth/login");
assert.equal(destination.searchParams.get("next"), "/?action=activity");
const station = await fetch(base + "/api/chargers?q=Bengaluru");
assert.ok([200, 429, 503].includes(station.status));
if (station.ok) {
  const data = await station.json();
  assert.ok(Array.isArray(data.stations));
  assert.ok(
    data.stations.every(
      (s) =>
        s.name &&
        s.location &&
        ["openstreetmap", "google", undefined].includes(s.source),
    ),
  );
} else await station.body?.cancel();
assert.match(station.headers.get("cache-control"), /no-store/);
console.log(
  "PASS: public map and clear homepage, forged identity rejection, protected writes, safe auth redirects and source-labelled station discovery with outage/quota fallback.",
);
