import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
export type PilotSnapshot = {
  version: 1;
  createdAt: string;
  tables: Record<string, Record<string, unknown>[]>;
};
type Envelope = {
  format: "chargeneighbour-backup-v1";
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
};
export function encryptSnapshot(
  snapshot: PilotSnapshot,
  passphrase: string,
): Envelope {
  if (passphrase.length < 20 || passphrase.length > 200)
    throw Error("Use a backup passphrase between 20 and 200 characters.");
  const salt = randomBytes(16),
    iv = randomBytes(12),
    key = scryptSync(passphrase, salt, 32),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(snapshot), "utf8"),
    cipher.final(),
  ]);
  return {
    format: "chargeneighbour-backup-v1",
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: encrypted.toString("base64"),
  };
}
export function decryptSnapshot(
  envelope: Envelope,
  passphrase: string,
): PilotSnapshot {
  if (
    envelope.format !== "chargeneighbour-backup-v1" ||
    passphrase.length < 20 ||
    passphrase.length > 200
  )
    throw Error("Unsupported backup or passphrase.");
  const key = scryptSync(passphrase, Buffer.from(envelope.salt, "base64"), 32),
    decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(envelope.iv, "base64"),
    );
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const data = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]);
  const snapshot = JSON.parse(data.toString("utf8"));
  if (snapshot.version !== 1 || !snapshot.tables)
    throw Error("Invalid snapshot.");
  return snapshot;
}
