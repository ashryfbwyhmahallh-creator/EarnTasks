import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDemoState } from "@/lib/demo";
import { publicConfig } from "@/lib/config";
import { errorResponse, Errors } from "@/lib/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function GET() {
  try {
    const user = await resolveUser();
    if (!user) throw Errors.unauthorized();
    if (user.isDemo) {
      const s = getDemoState();
      const today = startOfTodayIso();
      const activeToday = s.referrals.filter((r) => r.created_at >= today).length;
      const referralPoints = s.transactions
        .filter((t) => t.type === "REFERRAL_REWARD")
        .reduce((sum, t) => sum + t.points, 0);
      return NextResponse.json({
        referral_code: s.profile.referral_code,
        referral_link: publicConfig.siteUrl + "/register?ref=" + s.profile.referral_code,
        short_link: publicConfig.siteUrl + "/r/" + s.profile.referral_code,
        referred_count: s.referrals.length,
        active_today: activeToday,
        total_referral_points: referralPoints,
        commission_cents: referralPoints,
        referred_users: s.referrals.map((r) => ({ email: r.referred_email, status: r.status, joined: r.created_at })),
      });
    }
    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("referral_code").eq("id", user.id).maybeSingle();
    if (!profile) throw Errors.notFound("Profile");
    const { data: referredProfiles } = await admin
      .from("profiles").select("email, created_at").eq("referred_by", user.id).order("created_at", { ascending: false });
    const referredCount = (referredProfiles ?? []).length;
    const today = startOfTodayIso();
    const activeToday = (referredProfiles ?? []).filter((p) => (p.created_at as string) >= today).length;
    const { data: referralTx } = await admin.from("transactions").select("points").eq("user_id", user.id).eq("type", "REFERRAL_REWARD");
    const totalReferralPoints = (referralTx ?? []).reduce((s, r) => s + (r.points as number), 0);
    return NextResponse.json({
      referral_code: profile.referral_code,
      referral_link: publicConfig.siteUrl + "/register?ref=" + profile.referral_code,
      short_link: publicConfig.siteUrl + "/r/" + profile.referral_code,
      referred_count: referredCount,
      active_today: activeToday,
      total_referral_points: totalReferralPoints,
      commission_cents: totalReferralPoints,
      referred_users: (referredProfiles ?? []).map((p) => ({ email: p.email, status: "active", joined: p.created_at })),
    });
  } catch (err) { return errorResponse(err); }
}
