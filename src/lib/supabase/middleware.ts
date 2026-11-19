import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PLACEHOLDER_URL = "xyz.supabase.co";
const PLACEHOLDER_KEY_FRAGMENT = "placeholder";

/**
 * Returns true only when real Supabase credentials are present.
 * Placeholder or missing values are treated as "not configured" so the site
 * can still render in local/preview mode without hitting the auth backend.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) return false;
  if (!url.startsWith("https://") && !url.startsWith("http://")) return false;
  if (url.includes(PLACEHOLDER_URL)) return false;
  if (key.toLowerCase().includes(PLACEHOLDER_KEY_FRAGMENT)) return false;
  return true;
}
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
  supabase: SupabaseClient | null;
}> {
  let response = NextResponse.next({ request: { headers: request.headers } });

  // Not configured (empty or placeholder keys): skip auth entirely so pages
  // render instead of throwing "URL and Key are required".
  if (!isSupabaseConfigured()) {
    return { response, user: null, supabase: null };
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  let user: User | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  } catch {
    user = null;
  }

  return { response, user, supabase };
}