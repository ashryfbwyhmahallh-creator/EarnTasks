import { NextResponse, type NextRequest } from "next/server";
import { resolveUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDemoState, demoAddLedger } from "@/lib/demo";
import { errorResponse, Errors } from "@/lib/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const REWARD_POINTS = 50;

export async function GET() {
  try {
    const user = await resolveUser();
    if (!user) throw Errors.unauthorized();
    if (user.isDemo) {
      const s = getDemoState();
      return NextResponse.json({ claimed: s.surveyClaimed, reward_points: REWARD_POINTS });
    }
    const admin = createAdminClient();
    const { data } = await admin.from("welcome_survey_responses").select("id").eq("user_id", user.id).maybeSingle();
    return NextResponse.json({ claimed: Boolean(data), reward_points: REWARD_POINTS });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser();
    if (!user) throw Errors.unauthorized();
    const body = await req.json().catch(() => null);
    const answer = String(body?.answer ?? "").toLowerCase();
    if (answer !== "yes" && answer !== "no") throw Errors.badRequest("Answer must be yes or no");
    if (user.isDemo) {
      const s = getDemoState();
      if (s.surveyClaimed) return NextResponse.json({ already_claimed: true, reward_points: 0, wallet: s.wallet });
      s.surveyClaimed = true;
      demoAddLedger({ type: "ADMIN_ADJUSTMENT", status: "available", points: REWARD_POINTS, reference: "welcome_survey", description: "Welcome survey reward" });
      return NextResponse.json({ already_claimed: false, reward_points: REWARD_POINTS, wallet: s.wallet });
    }
    const admin = createAdminClient();
    const { data: existing } = await admin.from("welcome_survey_responses").select("id").eq("user_id", user.id).maybeSingle();
    if (existing) return NextResponse.json({ already_claimed: true, reward_points: 0 });
    const { data, error } = await admin.rpc("claim_welcome_survey", { p_user_id: user.id, p_answer: answer });
    if (error) {
      if (error.code === "23505") return NextResponse.json({ already_claimed: true, reward_points: 0 });
      throw Errors.badRequest(error.message);
    }
    return NextResponse.json(data);
  } catch (err) { return errorResponse(err); }
}
