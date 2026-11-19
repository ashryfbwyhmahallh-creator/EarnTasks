"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { registerSchema } from "@/lib/validation";
import { isSupabaseConfigured } from "@/lib/authConfig";
import { postJson } from "@/lib/apiClient";

export default function CreatorRegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = registerSchema.safeParse({ email, password, username: username || undefined });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signErr } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: { data: { username: parsed.data.username ?? null, is_creator: true } },
      });
      if (signErr) throw signErr;
      if (!data.user) { setError("Could not create your account. Please try again."); return; }
      if (data.session) {
        // Establish the server session, then promote the profile to creator.
        const s = await postJson("/api/auth/session", { email: parsed.data.email, username: parsed.data.username ?? null });
        if (!s.ok) { setError(s.error ?? "Account created, but we could not start your session. Please log in."); return; }
        const c = await postJson("/api/creator/register", { ...parsed.data });
        if (!c.ok) { setError(c.error ?? "Account created, but creator setup failed. Please contact support."); return; }
        window.location.href = "/creator";
      } else {
        // Email confirmation required.
        setDone(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally { setLoading(false); }
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a12] px-4 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-bold text-white">Confirm your email</h1>
          <p className="mt-2 text-white/60">We sent a confirmation link to <span className="text-emerald-300">{email}</span>. After confirming, log in to your creator dashboard.</p>
          <Link href="/creator/login" className="mt-6 inline-block rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-black hover:bg-emerald-400">Go to creator login</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a12] px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/creator" className="mb-6 block text-center text-2xl font-extrabold">
          <span className="text-emerald-400">Creator</span><span className="text-white">Hub</span>
        </Link>
        <h1 className="text-2xl font-bold text-white">Become a creator</h1>
        <p className="mt-1 text-sm text-white/60">Earn 50% commission on your referrals&apos; earnings, for life.</p>
        {!isSupabaseConfigured() && <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">Demo mode: Supabase is not configured, so a mock creator account is created locally.</p>}
        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-[#16161f] p-5">
          {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
          <div>
            <label className="mb-1 block text-sm text-white/80">Username / Channel name (optional)</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0f0f18] px-3 py-2 text-white" placeholder="yourchannel" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/80">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0f0f18] px-3 py-2 text-white" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/80">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0f0f18] px-3 py-2 text-white" placeholder="At least 8 characters" />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-black hover:bg-emerald-400 disabled:opacity-60">{loading ? "Creating..." : "Create creator account"}</button>
          <p className="text-center text-sm text-white/60">Already a creator? <Link href="/creator/login" className="text-emerald-300 hover:underline">Log in</Link></p>
          <p className="text-center text-xs text-white/40">Just here to earn? <Link href="/register" className="hover:underline">Standard sign up</Link></p>
        </form>
      </div>
    </main>
  );
}
