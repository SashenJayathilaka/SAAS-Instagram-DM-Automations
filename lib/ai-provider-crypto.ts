import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function encryptionKey() {
  const secret = process.env.AI_CONFIG_ENCRYPTION_KEY?.trim();
  if (!secret) throw new Error("AI_CONFIG_ENCRYPTION_KEY is not configured.");

  if (/^[a-f\d]{64}$/i.test(secret)) return Buffer.from(secret, "hex");

  try {
    const decoded = Buffer.from(secret, "base64");
    if (decoded.length === 32) return decoded;
  } catch {
    // Fall through to a stable digest for legacy string secrets.
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptAiProviderSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptAiProviderSecret(value: string) {
  const [version, ivRaw, tagRaw, encryptedRaw] = value.split(".");
  if (version !== VERSION || !ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Stored AI provider key has an unsupported format.");
  }

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function aiProviderEncryptionReady() {
  return Boolean(process.env.AI_CONFIG_ENCRYPTION_KEY?.trim());
}
