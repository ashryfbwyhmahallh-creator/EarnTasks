export function env(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (v === undefined) throw new Error(`Missing environment variable: ${key}`);
  return v;
}
export const serverConfig = {
  get supabaseUrl() { return env("NEXT_PUBLIC_SUPABASE_URL"); },
  get serviceRoleKey() { return env("SUPABASE_SERVICE_ROLE_KEY"); },
  get cpaleadPostbackPassword() { return env("CPALEAD_POSTBACK_PASSWORD"); },
  // Platform strictly retains 30% of the raw offer value.
  get platformCutPercentage() { return Number(env("PLATFORM_CUT_PERCENTAGE", "30")); },
  // The earning user keeps the remainder (default 70%).
  get cpaRewardPercentage() { return Number(env("CPA_REWARD_PERCENTAGE", String(100 - this.platformCutPercentage))); },
  get cpaEarningsGoalUsd() { return Number(env("CPALEAD_EARNINGS_GOAL_USD", "25.00")); },
  // Creator referrals earn 50% of the referred user's EARNED POINTS (not platform profit).
  get creatorCommissionPercentage() { return Number(env("CREATOR_COMMISSION_PERCENTAGE", "50")); },
  // Regular-user referrals earn 20% of the referred user's EARNED POINTS.
  get referralRewardPercentage() { return Number(env("REFERRAL_REWARD_PERCENTAGE", "20")); },
  get vpnApiKey() { return process.env.VPN_API_KEY ?? ""; },
  get adminEmails() {
    return (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  },
};export const publicConfig = { siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000" };