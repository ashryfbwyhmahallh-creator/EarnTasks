import { randomBytes } from "crypto";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateReferralCode(length = 6): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
export function normalizeReferralCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const cleaned = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(cleaned)) return null;
  return cleaned;
}