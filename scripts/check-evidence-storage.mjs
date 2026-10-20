import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
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
  const config = JSON.parse(input);
  secret = config.key;
  url = url || config.url;
  publicKey = publicKey || config.publicKey;
}
assert.ok(
  url && secret && publicKey,
  "Use existing production credentials through the private environment or hidden stdin.",
);
const client = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  }),
  bucket = "chargeneighbour-host-proof",
  path = `_technical-check/${crypto.randomUUID()}.jpg`;
const metadata = await client.storage.getBucket(bucket);
if (metadata.error) throw Error("Evidence bucket metadata unavailable");
assert.equal(metadata.data.public, false);
const keyHeaders = (key) => ({
  apikey: key,
  ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}),
});
const privateTable = await fetch(
  url + "/rest/v1/host_evidence?select=id&limit=0",
  { headers: keyHeaders(secret) },
);
assert.equal(privateTable.status, 200);
await privateTable.body?.cancel();
const anonymous = await fetch(
  url + "/rest/v1/host_evidence?select=id&limit=0",
  { headers: keyHeaders(publicKey) },
);
assert.ok([401, 403].includes(anonymous.status));
await anonymous.body?.cancel();
let uploaded = false;
try {
  const photo = await sharp({
    create: { width: 16, height: 16, channels: 3, background: "green" },
  })
    .jpeg()
    .toBuffer();
  const upload = await client.storage
    .from(bucket)
    .upload(path, photo, { contentType: "image/jpeg", cacheControl: "0" });
  if (upload.error) throw Error("Synthetic private Storage write failed");
  uploaded = true;
  const publicRead = await fetch(
    `${url}/storage/v1/object/public/${bucket}/${path}`,
  );
  assert.notEqual(publicRead.status, 200);
  await publicRead.body?.cancel();
  const signed = await client.storage.from(bucket).createSignedUrl(path, 30);
  if (signed.error) throw Error("Short-lived private Storage URL failed");
  const read = await fetch(signed.data.signedUrl);
  assert.equal(read.status, 200);
  assert.equal((await read.arrayBuffer()).byteLength, photo.length);
  console.log(
    "PASS: live evidence metadata access, anonymous denial, private image storage, public-read denial and short-lived signed image retrieval. No customer records were read or modified.",
  );
} finally {
  if (uploaded) {
    const removed = await client.storage.from(bucket).remove([path]);
    if (removed.error) throw Error("Synthetic evidence object cleanup failed");
  }
}
