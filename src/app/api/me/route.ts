import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDemoState } from "@/lib/demo";
import { errorResponse, Errors } from "@/lib/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await resolveUser();
    if (!user) throw Errors.unauthorized();
    if (user.isDemo) {
      const s = getDemoState();
      return NextResponse.json({ profile: s.profile });
    }
    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("id, email, username, referral_code, referred_by, country, is_admin, created_at")
      .eq("id", user.id).maybeSingle();
    if (error) throw Errors.badRequest(error.message);
    if (!profile) throw Errors.notFound("Profile");
    return NextResponse.json({ profile });
  } catch (err) { return errorResponse(err); }
}
