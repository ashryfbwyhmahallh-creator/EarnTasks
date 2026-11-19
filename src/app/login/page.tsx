"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validation";
import { isSupabaseConfigured } from "@/lib/authConfig";
import { postJson } from "@/lib/apiClient";
export default function LoginPage() {
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
      window.location.href = "/dashboard";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally { setLoading(false); }
  }
  return (
    <main className="mx-auto max-w-md px-4 py-16 animate-fade-in">
      <h1 className="text-3xl font-bold text-white">Welcome back</h1>
      <p className="mt-1 text-white/60">Log in to your EarnTasks account.</p>
      {!isSupabaseConfigured() && <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">Demo mode: any email and password will log you in locally.</p>}
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-brand-border bg-brand-card p-5">
        {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
        <div>
          <label className="mb-1 block text-sm text-white/80">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-white" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/80">Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-white" />
        </div>
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-brand-purple px-4 py-2.5 font-semibold text-white hover:bg-brand-purple-dark disabled:opacity-60">{loading ? "Logging in..." : "Log in"}</button>
        <p className="text-center text-sm text-white/60">No account? <Link href="/register" className="text-brand-purple hover:underline">Sign up</Link></p>
      </form>
    </main>
  );
}