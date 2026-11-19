import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProfile } from "@/lib/services/profile";
import { registerSchema } from "@/lib/validation";
import { isSupabaseConfigured } from "@/lib/authConfig";
import { serverConfig } from "@/lib/config";
import { errorResponse, Errors } from "@/lib/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Registers a creator account. Marks the profile as a creator so the affiliate
// portal and 50% commission logic apply. Fully separate from the user register flow.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ user: { id: "demo-user-0001" }, creator: true, demo: true });
    }

    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw Errors.unauthorized();

    const admin = createAdminClient();
    const profile = await ensureProfile(admin, user.id, user.email ?? "", parsed.data.ref ?? null);
    const isAdminEmail = user.email ? serverConfig.adminEmails.includes(user.email.toLowerCase()) : false;
    await admin.from("profiles").update({ is_creator: true, ...(isAdminEmail ? { is_admin: true } : {}) }).eq("id", user.id);

    return NextResponse.json({ user: { id: user.id }, profile: { ...profile, is_creator: true } });
  } catch (err) { return errorResponse(err); }
}