import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEMO_COOKIE } from "@/lib/authConfig";
export const runtime = "nodejs";

async function handler(req: NextRequest) {
  const supabase = createServerSupabase();
  try { await supabase.auth.signOut(); } catch { /* already signed out */ }
  const to = req.nextUrl.searchParams.get("to") === "creator" ? "/creator/login" : "/login";
  const res = NextResponse.redirect(new URL(to, req.url));
  // Clear the demo session cookie if present.
  res.cookies.set(DEMO_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest) { return handler(req); }
export async function POST(req: NextRequest) { return handler(req); }
