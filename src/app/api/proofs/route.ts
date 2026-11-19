import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { payoutProofSchema } from "@/lib/validation/proof";
import { errorResponse, Errors } from "@/lib/errors";
import { getClientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    rateLimit("proofs:" + getClientIp(req.headers), 10, 60000);
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw Errors.unauthorized();
    
    const body = await req.json().catch(() => null);
    const parsed = payoutProofSchema.safeParse(body);
    if (!parsed.success) throw Errors.badRequest("Invalid proof submission", parsed.error.flatten());
    
    const { withdrawal_id, phone_number, proof_url, note } = parsed.data;
    const admin = createAdminClient();
    
    const { data: withdrawal } = await admin.from("withdrawals").select("id, user_id, status").eq("id", withdrawal_id).maybeSingle();
    if (!withdrawal) throw Errors.notFound("Withdrawal");
    if (withdrawal.user_id !== user.id) throw Errors.forbidden();
    
    if (!["pending", "processing"].includes(withdrawal.status)) {
      throw Errors.badRequest("Proof can only be submitted for pending or processing withdrawals.");
    }

    const { data: row, error } = await admin
      .from("payout_proofs")
      .upsert({ withdrawal_id, user_id: user.id, phone_number, proof_url, note: note ?? null, status: "submitted" }, { onConflict: "withdrawal_id" })
      .select("*").single();
      
    if (error) throw Errors.badRequest(error.message);
    return NextResponse.json({ proof: row }, { status: 201 });
  } catch (err) { 
    return errorResponse(err); 
  }
}

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw Errors.unauthorized();
    
    const { data, error } = await supabase.from("payout_proofs").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) throw Errors.badRequest(error.message);
    
    return NextResponse.json({ proofs: data ?? [] });
  } catch (err) { 
    return errorResponse(err); 
  }
}