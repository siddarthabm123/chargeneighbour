import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { boundedText, readJson, uuid } from "../app/lib/http.ts";
import { validWebhook } from "../app/lib/payment-security.ts";
import { istToIso } from "../app/lib/reservations.ts";
assert.ok(uuid("11111111-1111-4111-8111-111111111111"));
assert.equal(uuid("not-a-uuid"), false);
await assert.rejects(
  boundedText(
    new Request("http://localhost", { method: "POST", body: "₹".repeat(5) }),
    10,
  ),
  (e) => e.status === 413,
);
await assert.rejects(
  readJson(
    new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "[]",
    }),
  ),
  (e) => e.status === 400,
);
const raw = '{"event":"fixture"}',
  secret = "synthetic-test-secret",
  signature = createHmac("sha256", secret).update(raw).digest("hex");
assert.equal(validWebhook(raw, signature, secret), true);
assert.equal(validWebhook(raw + " ", signature, secret), false);
assert.equal(validWebhook(raw, "x", secret), false);
assert.equal(istToIso("2026-10-20T12:00"), "2026-10-20T06:30:00.000Z");
console.log(
  "PASS: byte-bounded requests, JSON validation, UUIDs, webhook signatures and explicit IST conversion.",
);
