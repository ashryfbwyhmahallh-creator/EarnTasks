import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProfile } from "@/lib/services/profile";
import { serverConfig } from "@/lib/config";
import { isSupabaseConfigured, DEMO_COOKIE } from "@/lib/authConfig";
import { resetDemoState } from "@/lib/demo";
import { errorResponse, AppError } from "@/lib/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  try {
    if (!isSupabaseConfigured()) {
      // Demo mode: set a cookie so every API route accepts the session.
      resetDemoState((body?.email as string) ?? undefined, (body?.username as string) ?? undefined);
      const res = NextResponse.json({ user: { id: "demo-user-0001" }, demo: true });
      res.cookies.set(DEMO_COOKIE, "1", { path: "/", httpOnly: true, sameSite: "lax" });
      return res;
    }

    let user = null;
    try {
      const supabase = createServerSupabase();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch (authErr) {
      // Auth service/network hiccup: return a clean, retryable response (no 500).
      console.error("[auth/session] getUser failed:", authErr);
      return NextResponse.json(
        { error: "Could not verify session. Please try again.", code: "AUTH_UNAVAILABLE" },
        { status: 503 });
    }
    if (!user) return NextResponse.json({ user: null }, { status: 200 });

    let profile = null;
    try {
      const admin = createAdminClient();
      profile = await ensureProfile(admin, user.id, user.email ?? "", (body?.ref as string) ?? null);
      if (user.email && serverConfig.adminEmails.includes(user.email.toLowerCase())) {
        await admin.from("profiles").update({ is_admin: true }).eq("id", user.id);
      }
    } catch (profileErr) {
      // The auth session is still valid even if profile setup failed; surface it
      // gracefully so the client can retry rather than showing a hard 500.
      console.error("[auth/session] ensureProfile failed:", profileErr);
      return NextResponse.json(
        { user: { id: user.id }, profile: null, warning: "PROFILE_SETUP_RETRY" },
        { status: 200 });
    }

    return NextResponse.json({ user: { id: user.id }, profile });
  } catch (err) {
    if (err instanceof AppError && err.status === 503) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 503 });
    }
    return errorResponse(err);
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEMO_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}