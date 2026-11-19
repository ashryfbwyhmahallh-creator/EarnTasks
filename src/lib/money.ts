export const POINTS_PER_DOLLAR = 100;
export const CENTS_PER_DOLLAR = 100;

export function pointsToCents(points: number): number {
  if (!Number.isInteger(points)) throw new Error("points must be an integer");
  return points;
}
export function centsToPoints(cents: number): number {
  if (!Number.isInteger(cents)) throw new Error("cents must be an integer");
  return cents;
}
export function dollarsToCents(input: string | number): number {
  const raw = typeof input === "number" ? input.toFixed(2) : String(input).trim().replace(/^\$/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new Error(`Invalid dollar amount: ${input}`);
  const [whole, frac = ""] = raw.split(".");
  const fracPadded = (frac + "00").slice(0, 2);
  const cents = BigInt(whole) * BigInt(100) + BigInt(fracPadded);
  const result = Number(cents);
  if (!Number.isSafeInteger(result)) throw new Error("Amount too large");
  return result;
}
export function formatCents(cents: number, currency = "USD"): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = (abs % 100).toString().padStart(2, "0");
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${negative ? "-" : ""}${symbol}${whole}.${frac}`;
}
export function formatPointsAsDollars(points: number): string {
  return formatCents(pointsToCents(points));
}
export function dollarsToPointsMinimum(dollars: string | number): number {
  return dollarsToCents(dollars);
}
export function applyPercentage(cents: number, percentage: number): number {
  if (!Number.isInteger(cents)) throw new Error("cents must be an integer");
  if (!(percentage >= 0 && percentage <= 100)) throw new Error("percentage must be 0-100");
  return Math.floor((cents * Math.round(percentage)) / 100);
}