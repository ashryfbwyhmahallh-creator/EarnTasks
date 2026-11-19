"use client";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/Card";
import { formatCents } from "@/lib/money";

interface Conversion {
  id: string; lead_id: string; payout_cents: number; reward_points: number;
  campaign_id: string | null; campaign_name: string | null; country: string | null;
  event_type: string | null; status: string; created_at: string;
}

interface CpaData {
  earnings_cents: number; earnings_display: string; goal_cents: number; goal_display: string;
  remaining_display: string; conversions: number; progress_percent: number; latest: Conversion | null;
}

export default function AdminCpaleadPage() {
  const [data, setData] = useState<CpaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/cpalead");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load CPAlead data");
        if (active) setData(json);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Failed to load CPAlead data"); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">CPAlead performance</h1>
      <p className="mt-1 text-white/60">Publisher earnings tracker. All values are derived from real conversion records.</p>
      {error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
      )}
      {loading ? (
        <p className="mt-6 text-white/50">Loading...</p>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Publisher earnings" value={data?.earnings_display ?? "$0.00"} accent="gold" />
            <StatCard label="Goal" value={data?.goal_display ?? "$25.00"} accent="blue" />
            <StatCard label="Remaining" value={data?.remaining_display ?? "$25.00"} accent="purple" />
            <StatCard label="Conversions" value={String(data?.conversions ?? 0)} accent="gold" />
          </section>
          <section className="mt-6 rounded-2xl border border-brand-border bg-brand-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Progress</h2>
              <span className="text-sm text-white/60">{(data?.earnings_display ?? "$0.00") + " / " + (data?.goal_display ?? "$25.00")}</span>
            </div>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-brand-surface">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-gold transition-all" style={{ width: (data?.progress_percent ?? 0) + "%" }} />
            </div>
            <p className="mt-2 text-xs text-white/40">{(data?.progress_percent ?? 0).toFixed(1)}% complete. Remaining: {data?.remaining_display ?? "$25.00"}</p>
          </section>          <section className="mt-6 rounded-2xl border border-brand-border bg-brand-card p-5">
            <h2 className="font-semibold text-white">Latest conversion</h2>
            {data?.latest ? (
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Date / time" value={new Date(data.latest.created_at).toLocaleString()} />
                <Field label="Campaign" value={data.latest.campaign_name ?? data.latest.campaign_id ?? "-"} />
                <Field label="Country" value={data.latest.country ?? "-"} />
                <Field label="Payout (real)" value={formatCents(data.latest.payout_cents)} />
                <Field label="Points credited" value={String(data.latest.reward_points)} />
                <Field label="Status" value={data.latest.status} />
                <Field label="Event" value={data.latest.event_type ?? "default"} />
                <Field label="Lead ID" value={data.latest.lead_id} />
              </div>
            ) : (
              <p className="mt-3 text-white/50">No conversions yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-brand-border/60 bg-brand-surface p-3">
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 break-all text-white/90">{value}</p>
    </div>
  );
}