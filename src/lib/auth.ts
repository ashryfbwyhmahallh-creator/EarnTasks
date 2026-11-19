import "server-only";
import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured, DEMO_COOKIE } from "@/lib/authConfig";
import { DEMO_USER_ID, getDemoState } from "@/lib/demo";

export interface ResolvedUser { id: string; email: string; isDemo: boolean; isCreator: boolean; isAdmin: boolean; }

// Resolves the current user for API routes. In demo mode (Supabase not
// configured) it trusts the demo cookie set by /api/auth/session so that
// every route works without a real Supabase session.
export async function resolveUser(): Promise<ResolvedUser | null> {
  if (!isSupabaseConfigured()) {
    const cookieStore = cookies();
    const demo = cookieStore.get(DEMO_COOKIE);
    if (!demo) return null;
    const state = getDemoState();
    return { id: DEMO_USER_ID, email: state.profile.email, isDemo: true, isCreator: Boolean(state.profile.is_creator), isAdmin: Boolean(state.profile.is_admin) };
  }
  const supabase = createServerSupabase();
  let user: { id: string; email?: string } | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    user = data.user ?? null;
  } catch {
    return null;
  }
  if (!user) return null;
  let isCreator = false;
  let isAdmin = false;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data: prof } = await admin.from("profiles").select("is_creator, is_admin").eq("id", user.id).maybeSingle();
    isCreator = Boolean(prof?.is_creator);
    isAdmin = Boolean(prof?.is_admin);
  } catch { /* profile lookup is best-effort */ }
  return { id: user.id, email: user.email ?? "", isDemo: false, isCreator, isAdmin };
}
