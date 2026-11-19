"use client";
import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured, MOCK_SESSION_KEY } from "@/lib/authConfig";

interface MockUser { id: string; email: string }

function readMockUser(): MockUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MOCK_SESSION_KEY);
    return raw ? (JSON.parse(raw) as MockUser) : null;
  } catch { return null; }
}

function writeMockUser(user: MockUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) window.localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(MOCK_SESSION_KEY);
  } catch { /* ignore */ }
}
// Minimal stand-in for the Supabase browser client used only when real
// credentials are absent, so registration/login flows work locally.
function createMockClient() {
  return {
    auth: {
      async getUser() { return { data: { user: readMockUser() }, error: null }; },
      async signUp({ email }: { email: string; password?: string }) {
        const user: MockUser = { id: "mock-" + email, email };
        writeMockUser(user);
        return { data: { user, session: { access_token: "mock" } }, error: null };
      },
      async signInWithPassword({ email }: { email: string; password?: string }) {
        const user: MockUser = { id: "mock-" + email, email };
        writeMockUser(user);
        return { data: { user, session: { access_token: "mock" } }, error: null };
      },
      async signOut() { writeMockUser(null); return { error: null }; },
      async exchangeCodeForSession() { return { data: {}, error: null }; },
    },
    from() {
      const chain: Record<string, unknown> = {};
      const result = { data: [], error: null, count: 0 };
      const passthrough = () => chain;
      for (const m of ["select", "eq", "in", "order", "limit", "update", "insert", "upsert", "delete"]) chain[m] = passthrough;
      chain.single = async () => ({ data: null, error: null });
      chain.maybeSingle = async () => ({ data: null, error: null });
      chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
      return chain;
    },
  };
}
export type AppSupabaseClient = ReturnType<typeof createBrowserClient>;

export function createClient(): AppSupabaseClient {
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      console.warn("[EarnTasks] Supabase not configured - using MOCK auth. Set real NEXT_PUBLIC_SUPABASE_URL/ANON_KEY in .env.local.");
    }
    return createMockClient() as unknown as AppSupabaseClient;
  }
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
