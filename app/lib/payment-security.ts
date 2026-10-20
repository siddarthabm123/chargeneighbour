import { createHmac, timingSafeEqual } from "node:crypto";
export function validWebhook(raw: string, signature: string, secret: string) {
  if (!secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    createHmac("sha256", secret).update(raw).digest(),
  );
}
