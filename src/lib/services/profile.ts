import type { SupabaseClient } from "@supabase/supabase-js";
import { generateReferralCode, normalizeReferralCode } from "@/lib/referral";
import { AppError } from "@/lib/errors";

export async function ensureProfile(
  admin: SupabaseClient, userId: string, email: string, refCode?: string | null
) {
  const { data: existing } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (existing) return existing;
  const code = normalizeReferralCode(refCode);
  let referredBy: string | null = null;
  if (code) {
    const { data: referrer } = await admin.from("profiles").select("id").eq("referral_code", code).maybeSingle();
    // Prevent self-referral.
    if (referrer && referrer.id !== userId) referredBy = referrer.id;
  }
  let referralCode = generateReferralCode();
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await admin.from("profiles").select("id").eq("referral_code", referralCode).maybeSingle();
    if (!clash) break;
    referralCode = generateReferralCode();
  }
  const { data: profile, error } = await admin
    .from("profiles")
    .insert({ id: userId, email, referral_code: referralCode, referred_by: referredBy })
    .select("*").single();
  if (error) {
    const { data: again } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (again) return again;
    throw new AppError(error.message, "PROFILE_CREATE_FAILED", 500);
  }
  await admin.from("wallets").upsert({ user_id: userId }, { onConflict: "user_id" });
  // Track the referral relationship (safe to ignore if table/constraint absent).
  if (referredBy) {
    await admin.from("referrals").insert({ referrer_id: referredBy, referred_id: userId, status: "active", source: "link" });
  }
  return profile;
}
