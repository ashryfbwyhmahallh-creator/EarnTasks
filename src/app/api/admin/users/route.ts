import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorResponse, Errors } from "@/lib/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INACTIVE_DAYS = 7;

async function requireAdmin() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw Errors.unauthorized();
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id, is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) throw Errors.forbidden();
  return { admin, adminId: user.id };
}

export async function GET(req: NextRequest) {
  try {
    const { admin } = await requireAdmin();
    const q = req.nextUrl.searchParams.get("q")?.trim();
    const inactiveOnly = req.nextUrl.searchParams.get("inactive") === "1";
    let query = admin.from("profiles")
      .select("id, email, username, referral_code, country, is_admin, is_blocked, created_at")
      .order("created_at", { ascending: false }).limit(500);
    if (q) query = query.or("email.ilike.%" + q + "%,username.ilike.%" + q + "%,referral_code.ilike.%" + q + "%");
    const { data, error } = await query;
    if (error) throw Errors.badRequest(error.message);

    // Enrich each profile with last_sign_in_at from auth.users (admin API).
    const lastSignIn = new Map<string, string | null>();
    try {
      let page = 1;
      const perPage = 1000;
      for (;;) {
        const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page, perPage });
        if (listErr) break;
        for (const u of list.users) lastSignIn.set(u.id, u.last_sign_in_at ?? null);
        if (!list.users || list.users.length < perPage) break;
        page += 1;
      }
    } catch { /* auth listing is best-effort */ }

    const cutoff = Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000;
    let users = (data ?? []).map((p) => {
      const signIn = lastSignIn.get(p.id) ?? null;
      const createdAt = p.created_at as string;
      const reference = signIn ?? createdAt;
      const inactive = new Date(reference).getTime() < cutoff;
      return { ...p, last_sign_in_at: signIn, inactive, inactive_days: INACTIVE_DAYS };
    });
    if (inactiveOnly) users = users.filter((u) => u.inactive);
    return NextResponse.json({ users, inactive_days: INACTIVE_DAYS });
  } catch (err) { return errorResponse(err); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { admin, adminId } = await requireAdmin();
    const body = await req.json().catch(() => null);
    const { user_id, is_blocked } = body ?? {};
    if (!user_id) throw Errors.badRequest("user_id is required");
    const update: Record<string, unknown> = {};
    if (typeof is_blocked === "boolean") update.is_blocked = is_blocked;
    if (Object.keys(update).length === 0) throw Errors.badRequest("Nothing to update");
    const { data, error } = await admin.from("profiles").update(update).eq("id", user_id).select("*").single();
    if (error) throw Errors.badRequest(error.message);
    await admin.from("admin_audit_log").insert({
      admin_id: adminId, action: "USER_UPDATE", target_type: "profile", target_id: user_id, metadata: update,
    });
    return NextResponse.json({ user: data });
  } catch (err) { return errorResponse(err); }
}
