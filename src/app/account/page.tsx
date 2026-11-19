"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { StatCard } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPointsAsDollars } from "@/lib/money";
import type { Transaction } from "@/types";
interface Profile { email: string; username: string | null; referral_code: string; country: string | null; created_at: string }
const TYPE_LABEL: Record<string, string> = {
  CPA_REWARD: "Offer reward", REFERRAL_REWARD: "Referral reward", WITHDRAWAL: "Withdrawal",
  WITHDRAWAL_REVERSAL: "Withdrawal reversal", ADMIN_ADJUSTMENT: "Adjustment",
};
export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<{ available_points: number; pending_points: number; total_earned_points: number } | null>(null);
  const [tx, setTx] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p, w, t] = await Promise.all([
          fetch("/api/me").then((r) => r.json()),
          fetch("/api/wallet").then((r) => r.json()),
          fetch("/api/transactions?limit=100").then((r) => r.json()),
        ]);
        if (!active) return;
        if (p.error) throw new Error(p.error);
        setProfile(p.profile); setWallet(w.wallet); setTx(t.transactions ?? []);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Failed to load"); }
    })();
    return () => { active = false; };
  }, []);
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-white">Account</h1>
        {error && <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          {wallet ? (
            <>
              <StatCard label="Available" value={formatPointsAsDollars(wallet.available_points)} accent="gold" />
              <StatCard label="Pending" value={formatPointsAsDollars(wallet.pending_points)} accent="blue" />
              <StatCard label="Total earned" value={formatPointsAsDollars(wallet.total_earned_points)} accent="purple" />
            </>
          ) : (Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />))}
        </section>
        <section className="mt-6 rounded-2xl border border-brand-border bg-brand-card p-5">
          <h2 className="font-semibold text-white">Profile</h2>
          {profile ? (
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <Row label="Email" value={profile.email} />
              <Row label="Username" value={profile.username ?? "-"} />
              <Row label="Referral code" value={profile.referral_code} />
              <Row label="Country" value={profile.country ?? "-"} />
              <Row label="Member since" value={new Date(profile.created_at).toLocaleDateString()} />
            </dl>
          ) : (<Skeleton className="mt-3 h-24 w-full" />)}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/withdraw" className="rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white hover:bg-brand-purple-dark">Withdraw</Link>
            <Link href="/proof" className="rounded-lg border border-brand-border bg-brand-surface px-4 py-2 text-sm text-white/80 hover:text-white">Submit payout proof</Link>
            <a href="https://wa.me/22233519640" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-brand-border bg-brand-surface px-4 py-2 text-sm text-white/80 hover:text-white">Help / Support</a>
          </div>
        </section>
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-white">Transaction history</h2>
          {tx.length === 0 ? (
            <div className="rounded-2xl border border-brand-border bg-brand-card p-6 text-center text-white/50">No transactions yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-brand-border bg-brand-card">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-brand-border text-left text-xs uppercase text-white/50">
                    <th className="px-4 py-3">Date</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {tx.map((t) => (
                    <tr key={t.id} className="border-b border-brand-border/60 last:border-0">
                      <td className="px-4 py-3 text-white/60">{new Date(t.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-white/80">{TYPE_LABEL[t.type] ?? t.type}</td>
                      <td className="px-4 py-3 text-white/60">{t.description ?? "-"}</td>
                      <td className="px-4 py-3 capitalize text-white/60">{t.status}</td>
                      <td className={"px-4 py-3 text-right font-medium " + (t.points >= 0 ? "text-brand-gold" : "text-red-300")}>{t.points >= 0 ? "+" : ""}{t.points}</td>
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
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-brand-border/40 py-1.5">
      <dt className="text-white/50">{label}</dt><dd className="text-white/90">{value}</dd>
    </div>
  );
}