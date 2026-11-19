import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/authConfig";
import { AppError } from "@/lib/errors";
let cached: SupabaseClient | null = null;
export function createAdminClient(): SupabaseClient {
  if (cached) return cached;
  if (!isSupabaseConfigured()) {
    throw new AppError("Supabase is not configured", "SUPABASE_NOT_CONFIGURED", 503);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new AppError("Missing Supabase service credentials", "SUPABASE_NOT_CONFIGURED", 503);
  }
  try {
    cached = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { "x-application-name": "earntasks-admin" } },
    });
  } catch (err) {
    throw new AppError(
      "Failed to initialize Supabase admin client: " + (err instanceof Error ? err.message : "unknown error"),
      "SUPABASE_INIT_FAILED", 503);
  }
  return cached;
}