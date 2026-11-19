"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { registerSchema } from "@/lib/validation";
import { isSupabaseConfigured } from "@/lib/authConfig";
import { postJson } from "@/lib/apiClient";
function RegisterForm() {
  const params = useSearchParams();
  const ref = params.get("ref") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = registerSchema.safeParse({ email, password, username: username || undefined, ref: ref || undefined });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signErr } = await supabase.auth.signUp({
        email: parsed.data.email, password: parsed.data.password,
        options: { data: { username: parsed.data.username ?? null, ref: ref || null } },
      });
      if (signErr) throw signErr;
      if (data.user && data.session) {
        const res = await postJson("/api/auth/session", { ref: ref || null, email: parsed.data.email, username: parsed.data.username ?? null });
        if (!res.ok) { setError(res.error ?? "Account created, but we could not start your session. Please log in."); return; }
        window.location.href = "/dashboard";
      } else { setDone(true); }
    } catch (e) { setError(e instanceof Error ? e.message : "Registration failed"); }
    finally { setLoading(false); }
  }
  if (done) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Check your email</h1>
        <p className="mt-2 text-white/60">We sent a confirmation link to <span className="text-brand-blue">{email}</span>.</p>
        <Link href="/login" className="mt-6 inline-block text-brand-purple hover:underline">Back to login</Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-md px-4 py-12 animate-fade-in">
      <h1 className="text-3xl font-bold text-white">Create account</h1>
      <p className="mt-1 text-white/60">Start earning Points from real offers.</p>
      {!isSupabaseConfigured() && <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">Demo mode: Supabase is not configured, so a mock account is created and stored locally.</p>}
      {ref && <p className="mt-2 rounded-lg border border-brand-blue/30 bg-brand-blue/10 px-3 py-2 text-sm text-brand-blue">Referral code applied: {ref}</p>}
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-brand-border bg-brand-card p-5">
        {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
        <div>
          <label className="mb-1 block text-sm text-white/80">Username (optional)</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-white" placeholder="gamer123" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/80">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-white" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/80">Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-white" placeholder="At least 8 characters" />
        </div>
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-brand-purple px-4 py-2.5 font-semibold text-white hover:bg-brand-purple-dark disabled:opacity-60">{loading ? "Creating..." : "Create account"}</button>
        <p className="text-center text-sm text-white/60">Already have an account? <Link href="/login" className="text-brand-purple hover:underline">Log in</Link></p>
      </form>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-md px-4 py-16 text-center text-white/50">Loading...</main>}>
      <RegisterForm />
    </Suspense>
  );
}
