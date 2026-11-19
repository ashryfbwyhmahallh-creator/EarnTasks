// Shared detection of whether real Supabase credentials are present.
// Works in both client and server code because it only reads NEXT_PUBLIC_* vars.
const PLACEHOLDER_URL = "xyz.supabase.co";
const PLACEHOLDER_KEY_FRAGMENT = "placeholder";

export function isSupabaseConfigured(): boolean {
  // NEXT_PUBLIC_* must be read literally so Next.js can inline them at build time.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) return false;
  if (!url.startsWith("https://") && !url.startsWith("http://")) return false;
  if (url.includes(PLACEHOLDER_URL)) return false;
  if (key.toLowerCase().includes(PLACEHOLDER_KEY_FRAGMENT)) return false;
  return true;
}

export const MOCK_SESSION_KEY = "earntasks_mock_session";
export const DEMO_COOKIE = "earntasks_demo_session";
