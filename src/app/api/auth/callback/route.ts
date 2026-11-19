import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProfile } from "@/lib/services/profile";
import { serverConfig } from "@/lib/config";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const ref = searchParams.get("ref");
  const next = searchParams.get("next") ?? "/dashboard";
  if (code) {
    const supabase = createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const admin = createAdminClient();
    await ensureProfile(admin, user.id, user.email ?? "", ref);
    if (user.email && serverConfig.adminEmails.includes(user.email.toLowerCase())) {
      await admin.from("profiles").update({ is_admin: true }).eq("id", user.id);
    }
  }
  return NextResponse.redirect(origin + next);
}