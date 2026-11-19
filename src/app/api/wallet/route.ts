import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDemoState } from "@/lib/demo";
import { getWallet } from "@/lib/services/wallet";
import { errorResponse, Errors } from "@/lib/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await resolveUser();
    if (!user) throw Errors.unauthorized();
    if (user.isDemo) {
      const s = getDemoState();
      return NextResponse.json({ wallet: s.wallet });
    }
    const admin = createAdminClient();
    const wallet = await getWallet(admin, user.id);
    return NextResponse.json({ wallet });
  } catch (err) { return errorResponse(err); }
}
