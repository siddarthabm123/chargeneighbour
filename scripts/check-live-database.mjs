import assert from "node:assert/strict";
let {
  SUPABASE_URL: url,
  SUPABASE_SECRET_KEY: secret,
  SUPABASE_PUBLISHABLE_KEY: publicKey,
} = process.env;
if ((!secret || !publicKey) && process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdout.write(
    "Ready for verification credential JSON on stdin (input is hidden).\n",
  );
  const input = await new Promise((resolve, reject) => {
    let value = "";
    process.stdin.on("data", (chunk) => {
      value += chunk.toString();
      if (value.includes("\u0003")) reject(Error("Cancelled"));
      if (/[\r\n]/.test(value)) resolve(value.split(/[\r\n]/)[0]);
    });
  });
  process.stdin.setRawMode(false);
  process.stdin.pause();
  let config;
  try {
    config = JSON.parse(input);
  } catch {
    throw Error("Invalid credential input.");
  }
  secret = config.key;
  url = url || config.url;
  publicKey = publicKey || config.publicKey;
}
assert.ok(
  url && secret && publicKey,
  "Run with the existing production environment, without printing credentials.",
);
const headers = (key) => ({
  apikey: key,
  ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}),
});
const fetch = (url, options = {}) =>
  globalThis.fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
for (const table of [
  "marketplace_requests",
  "host_chargers",
  "host_locations",
  "host_slots",
  "reservations",
  "support_tickets",
  "session_ledger",
  "payment_events",
  "funnel_daily",
  "operation_events",
]) {
  const privateResponse = await fetch(
    `${url}/rest/v1/${table}?select=*&limit=0`,
    { headers: headers(secret) },
  );
  assert.equal(privateResponse.status, 200, `Server schema access: ${table}`);
  const publicResponse = await fetch(
    `${url}/rest/v1/${table}?select=*&limit=1`,
    { headers: headers(publicKey) },
  );
  assert.ok(
    [401, 403].includes(publicResponse.status),
    `Anonymous access must be denied: ${table}`,
  );
}
const call = async (key, name, body) =>
  fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { ...headers(key), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const bucket = {
  p_bucket: `deployment-check:${crypto.randomUUID()}`,
  p_limit: 1,
  p_seconds: 60,
};
assert.equal(await (await call(secret, "take_allowance", bucket)).json(), true);
assert.equal(
  await (await call(secret, "take_allowance", bucket)).json(),
  false,
);
assert.ok(
  [401, 403].includes((await call(publicKey, "take_allowance", bucket)).status),
);
console.log(
  "PASS: live schema access, anonymous denial on private tables/functions, and atomic quota enforcement. No customer records were read, created or changed.",
);
