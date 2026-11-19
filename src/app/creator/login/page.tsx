"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validation";
import { isSupabaseConfigured } from "@/lib/authConfig";
import { postJson } from "@/lib/apiClient";

export default function CreatorLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
      if (signErr) throw signErr;
      if (isSupabaseConfigured()) {
        const res = await postJson("/api/auth/session", {});
        if (!res.ok) { setError(res.error ?? "Signed in, but we could not start your session. Please retry."); return; }
      }
      // Verify this account actually has creator access.
      const check = await fetch("/api/creator/stats");
      if (check.status === 403) {
        setError("This account is not a creator. Apply for creator access or use the standard login.");
        return;
      }
      window.location.href = "/creator";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally { setLoading(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a12] px-4">
      <div className="w-full max-w-md">
        <Link href="/creator" className="mb-6 block text-center text-2xl font-extrabold">
          <span className="text-emerald-400">Creator</span><span className="text-white">Hub</span>
        </Link>
        <h1 className="text-2xl font-bold text-white">Creator login</h1>
        <p className="mt-1 text-sm text-white/60">Sign in to your affiliate dashboard.</p>
        {!isSupabaseConfigured() && <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">Demo mode: Supabase is not configured.</p>}
        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-[#16161f] p-5">
          {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
          <div>
            <label className="mb-1 block text-sm text-white/80">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0f0f18] px-3 py-2 text-white" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/80">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0f0f18] px-3 py-2 text-white" />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-black hover:bg-emerald-400 disabled:opacity-60">{loading ? "Signing in..." : "Sign in"}</button>
          <p className="text-center text-sm text-white/60">Want to become a creator? <Link href="/creator/register" className="text-emerald-300 hover:underline">Apply now</Link></p>
          <p className="text-center text-xs text-white/40">Not a creator? <Link href="/login" className="hover:underline">Standard login</Link></p>
        </form>
      </div>
    </main>
  );
}
