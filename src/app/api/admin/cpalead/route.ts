import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublisherEarnings } from "@/lib/services/cpalead";
import { serverConfig } from "@/lib/config";
import { dollarsToCents, formatCents } from "@/lib/money";
import { errorResponse, Errors } from "@/lib/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function requireAdmin() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw Errors.unauthorized();
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id, is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) throw Errors.forbidden();
  return { admin };
}
export async function GET() {
  try {
    const { admin } = await requireAdmin();
    const earningsCents = await getPublisherEarnings(admin);
    const goalCents = dollarsToCents(serverConfig.cpaEarningsGoalUsd);
    const remainingCents = Math.max(goalCents - earningsCents, 0);
    const { count } = await admin.from("cpalead_conversions").select("id", { count: "exact", head: true });
    const { data: latest } = await admin.from("cpalead_conversions")
      .select("id, lead_id, payout_cents, reward_points, campaign_id, campaign_name, country, event_type, status, created_at")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    return NextResponse.json({
      earnings_cents: earningsCents, earnings_display: formatCents(earningsCents),
      goal_cents: goalCents, goal_display: formatCents(goalCents),
      remaining_cents: remainingCents, remaining_display: formatCents(remainingCents),
      conversions: count ?? 0,
      progress_percent: goalCents > 0 ? Math.min((earningsCents / goalCents) * 100, 100) : 0,
      latest: latest ?? null,
    });
  } catch (err) { return errorResponse(err); }
}