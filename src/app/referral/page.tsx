"use client";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { StatCard } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPointsAsDollars } from "@/lib/money";
interface ReferralData { referral_code: string; referral_link: string; referred_count: number; total_referral_points: number }
interface TxRow { id: string; points: number; created_at: string; description: string | null; type: string }
export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [history, setHistory] = useState<TxRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [r, t] = await Promise.all([
          fetch("/api/referrals").then((res) => res.json()),
          fetch("/api/transactions?limit=100").then((res) => res.json()),
        ]);
        if (!active) return;
        if (r.error) throw new Error(r.error);
        setData(r);
        setHistory((t.transactions ?? []).filter((x: TxRow) => x.type === "REFERRAL_REWARD"));
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
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-white">Referral</h1>
        <p className="mt-1 text-white/60">Invite friends and earn 20% of the Points they earn from qualifying offers - for life.</p>
        {error && <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
        <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {data ? (
            <>
              <StatCard label="Referrals" value={String(data.referred_count)} accent="blue" />
              <StatCard label="Referral earnings" value={formatPointsAsDollars(data.total_referral_points)} accent="gold" />
              <StatCard label="Your code" value={data.referral_code} accent="purple" />
            </>
          ) : (Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />))}
        </section>
        <section className="mt-6 rounded-2xl border border-brand-border bg-brand-card p-5">
          <label className="text-sm text-white/70">Your referral link</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input readOnly value={data?.referral_link ?? ""} className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-white" />
            <button onClick={copy} disabled={!data} className="shrink-0 rounded-lg bg-brand-purple px-4 py-2 font-semibold text-white hover:bg-brand-purple-dark disabled:opacity-60">{copied ? "Copied!" : "Copy"}</button>
          </div>
          <p className="mt-3 text-xs text-white/40">Rewards are only paid for real, qualifying earnings. Self-referrals and fraudulent activity are blocked.</p>
        </section>
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-white">Referral reward history</h2>
          {history.length === 0 ? (
            <div className="rounded-2xl border border-brand-border bg-brand-card p-6 text-center text-white/50">No referral rewards yet.</div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border text-left text-xs uppercase text-white/50">
                    <th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b border-brand-border/60 last:border-0">
                      <td className="px-4 py-3 text-white/60">{new Date(h.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-white/80">{h.description ?? "Referral reward"}</td>
                      <td className="px-4 py-3 text-right font-medium text-brand-gold">+{h.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}