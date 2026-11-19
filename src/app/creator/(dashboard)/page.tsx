"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPointsAsDollars } from "@/lib/money";

interface CreatorData {
  referral_code: string; referral_link: string;
  referred_count: number; active_today: number;
  total_referral_points: number; commission_cents: number;
  referred_users: { email: string; status: string; joined: string }[];
}

export default function CreatorOverviewPage() {
  const [data, setData] = useState<CreatorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/creator/stats");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load creator data");
        if (active) setData(json);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Failed to load"); }
    })();
    return () => { active = false; };
  }, []);
  async function copy() {
    if (!data) return;
    try { await navigator.clipboard.writeText(data.referral_link); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { setError("Could not copy to clipboard"); }
  }
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-white">Creator Dashboard</h1>
      <p className="mt-1 text-white/60">Track your referrals, commission, and growth.</p>
      {error && <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
      <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {data ? (
          <>
            <StatCard label="Referred users" value={String(data.referred_count)} accent="blue" />
            <StatCard label="Active today" value={String(data.active_today)} accent="purple" />
            <StatCard label="Total commission" value={formatPointsAsDollars(data.total_referral_points)} accent="gold" />
            <StatCard label="Your code" value={data.referral_code} accent="purple" />
          </>
        ) : (Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />))}
      </section>
      <section className="mt-6 rounded-2xl border border-white/10 bg-[#16161f] p-5">
        <label className="text-sm text-white/70">Your unique referral link</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input readOnly value={data?.referral_link ?? ""} className="w-full rounded-lg border border-white/10 bg-[#0f0f18] px-3 py-2 text-white" />
          <button onClick={copy} disabled={!data} className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-black hover:bg-emerald-400 disabled:opacity-60">{copied ? "Copied!" : "Copy"}</button>
          <Link href="/creator/withdraw" className="shrink-0 rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-4 py-2 text-center font-semibold text-emerald-300 hover:bg-emerald-400/20">Request payout</Link>
        </div>
        <p className="mt-3 text-xs text-white/40">Earn 50% of the Points your referrals make from qualifying offers - for life. Self-referrals are blocked.</p>
      </section>
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-white">Your referrals</h2>
        {!data ? (
          <Skeleton className="h-40 w-full" />
        ) : data.referred_users.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#16161f] p-6 text-center text-white/50">No referrals yet. Share your link to get started!</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#16161f]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase text-white/50">
                  <th className="px-4 py-3">User</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.referred_users.map((u, i) => (
                  <tr key={i} className="border-b border-white/10 last:border-0">
                    <td className="px-4 py-3 text-white/80">{u.email}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">{u.status}</span></td>
                    <td className="px-4 py-3 text-white/60">{new Date(u.joined).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

