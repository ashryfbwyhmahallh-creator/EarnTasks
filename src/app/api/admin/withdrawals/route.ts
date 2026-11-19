import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorResponse, Errors, AppError } from "@/lib/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ALLOWED: Record<string, string[]> = {
  pending: ["processing", "rejected", "cancelled"],
  processing: ["paid", "rejected"],
  paid: [], rejected: [], cancelled: [],
};
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
    const status = req.nextUrl.searchParams.get("status");
    let query = admin.from("withdrawals")
      .select("id, user_id, method, amount_points, amount_cents, destination, status, admin_note, created_at, processed_at, profiles(email, username)")
      .order("created_at", { ascending: false }).limit(200);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw Errors.badRequest(error.message);
    return NextResponse.json({ withdrawals: data ?? [] });
  } catch (err) { return errorResponse(err); }
}
export async function PATCH(req: NextRequest) {
  try {
    const { admin, adminId } = await requireAdmin();
    const body = await req.json().catch(() => null);
    const { withdrawal_id, status, admin_note } = body ?? {};
    if (!withdrawal_id || !status) throw Errors.badRequest("withdrawal_id and status are required");
    const { data: w } = await admin.from("withdrawals").select("*").eq("id", withdrawal_id).maybeSingle();
    if (!w) throw Errors.notFound("Withdrawal");
    const allowed = ALLOWED[w.status] ?? [];
    if (!allowed.includes(status)) throw new AppError("Cannot move withdrawal from " + w.status + " to " + status, "INVALID_TRANSITION", 400);
    const update: Record<string, unknown> = { status, admin_note: admin_note ?? w.admin_note };
    if (status === "paid" || status === "rejected") update.processed_at = new Date().toISOString();
    const { data: updated, error } = await admin.from("withdrawals").update(update).eq("id", withdrawal_id).select("*").single();
    if (error) throw Errors.badRequest(error.message);
    if (status === "rejected") {
      await admin.rpc("apply_wallet_transaction", {
        p_user_id: w.user_id, p_type: "WITHDRAWAL_REVERSAL", p_status: "available",
        p_points: w.amount_points, p_reference: w.id, p_description: "Withdrawal rejected - points refunded",
      });
    }
    await admin.from("admin_audit_log").insert({
      admin_id: adminId, action: "WITHDRAWAL_STATUS_CHANGE", target_type: "withdrawal",
      target_id: withdrawal_id, metadata: { from: w.status, to: status, note: admin_note ?? null },
    });
    return NextResponse.json({ withdrawal: updated });
  } catch (err) { return errorResponse(err); }
}