import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");
export function unsubscribeToken(id: string) {
  const secret = process.env.AP3K_MARKETING_SIGNING_SECRET?.trim() || process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("Marketing signing key unavailable");
  return createHmac("sha256", secret).update(`ap3k-marketing-unsubscribe-v1:${id}`).digest("hex");
}
export function validUnsubscribeToken(id: string, token: string) {
  if (!/^[0-9a-f]{64}$/.test(token) || !(process.env.AP3K_MARKETING_SIGNING_SECRET?.trim() || process.env.RESEND_WEBHOOK_SECRET?.trim())) return false;
  return timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(unsubscribeToken(id), "hex"));
}
export function validConfirmation(hash: string, token: string, expiresAt: Date, now = Date.now()) {
  return /^[0-9a-f]{64}$/.test(token) && /^[0-9a-f]{64}$/.test(hash)
    && expiresAt.getTime() > now && timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(hashToken(token), "hex"));
}
