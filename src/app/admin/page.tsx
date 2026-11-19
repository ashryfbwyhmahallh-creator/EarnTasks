"use client";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/Card";
import { formatCents } from "@/lib/money";
interface CpaData {
  earnings_display: string; goal_display: string; remaining_display: string; conversions: number;
  progress_percent: number;
  latest: { campaign_name: string | null; country: string | null; payout_cents: number; created_at: string } | null;
}
export default function AdminOverviewPage() {
  const [cpa, setCpa] = useState<CpaData | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [c, w, u] = await Promise.all([
          fetch("/api/admin/cpalead").then((r) => r.json()),
          fetch("/api/admin/withdrawals?status=pending").then((r) => r.json()),
          fetch("/api/admin/users").then((r) => r.json()),
        ]);
        if (!active) return;
        if (c.error) throw new Error(c.error);
        setCpa(c);
        setPendingCount((w.withdrawals ?? []).length);
        setUserCount((u.users ?? []).length);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Failed to load admin data"); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);
  if (error) return <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>;
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Admin Overview</h1>
      <p className="mt-1 text-white/60">Real platform data. No invented figures.</p>
      {loading ? (<p className="mt-6 text-white/50">Loading...</p>) : (
        <>
          <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="CPAlead earnings" value={cpa ? cpa.earnings_display + " / " + cpa.goal_display : "$0.00 / $25.00"} accent="gold" />
            <StatCard label="Remaining to goal" value={cpa?.remaining_display ?? "$25.00"} accent="blue" />
            <StatCard label="Conversions" value={String(cpa?.conversions ?? 0)} accent="purple" />
            <StatCard label="Pending withdrawals" value={pendingCount === null ? "-" : String(pendingCount)} accent="gold" />
          </section>
          <section className="mt-6 rounded-2xl border border-brand-border bg-brand-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">CPAlead publisher progress</h2>
              <span className="text-sm text-white/60">{cpa ? cpa.earnings_display + " / " + cpa.goal_display : "-"}</span>
            </div>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-brand-surface">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-gold transition-all" style={{ width: (cpa?.progress_percent ?? 0) + "%" }} />
            </div>
            <p className="mt-2 text-xs text-white/40">{cpa ? (cpa.progress_percent ?? 0).toFixed(1) + "% of the $25.00 goal" : "No conversions yet."}</p>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              <div><p className="text-white/50">Latest conversion</p><p className="text-white/90">{cpa?.latest ? new Date(cpa.latest.created_at).toLocaleString() : "None yet"}</p></div>
              <div><p className="text-white/50">Campaign</p><p className="text-white/90">{cpa?.latest?.campaign_name ?? "-"}</p></div>
              <div><p className="text-white/50">Country / Payout</p><p className="text-white/90">{cpa?.latest ? (cpa.latest.country ?? "-") + " - " + formatCents(cpa.latest.payout_cents) : "-"}</p></div>
            </div>
          </section>
          <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Registered users" value={userCount === null ? "-" : String(userCount)} accent="purple" />
          </section>
        </>
      )}
    </div>
  );
}