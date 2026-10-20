import assert from "node:assert/strict";
const base = "https://chargeneighbour-theta.vercel.app";
for (const path of [
  "/",
  "/api/health",
  "/manifest.webmanifest",
  "/offline.html",
]) {
  const response = await fetch(base + path, {
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  assert.equal(response.status, 200, path);
  if (path === "/api/health")
    assert.equal((await response.json()).database, true);
  else await response.body?.cancel();
}
console.log(
  "PASS: production homepage, database health, install manifest and offline notice. Provider activation and real charging acceptance remain separate.",
);
