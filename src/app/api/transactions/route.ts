import { NextResponse, type NextRequest } from "next/server";
import { resolveUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { getDemoState } from "@/lib/demo";
import { errorResponse, Errors } from "@/lib/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser();
    if (!user) throw Errors.unauthorized();
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 100);
    if (user.isDemo) {
      const s = getDemoState();
      return NextResponse.json({ transactions: s.transactions.slice(0, limit) });
    }
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("transactions").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(limit);
    if (error) throw Errors.badRequest(error.message);
    return NextResponse.json({ transactions: data ?? [] });
  } catch (err) { return errorResponse(err); }
}
