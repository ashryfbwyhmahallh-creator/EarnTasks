import { Errors } from "@/lib/errors";
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) { buckets.set(key, { count: 1, resetAt: now + windowMs }); return; }
  b.count++;
  if (b.count > limit) throw Errors.badRequest("Too many requests. Please slow down.");
}
export function getClientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}