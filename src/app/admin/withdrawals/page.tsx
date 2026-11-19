"use client";
import { useCallback, useEffect, useState } from "react";

interface AdminWithdrawal {
  id: string; user_id: string; method: string; amount_points: number; amount_cents: number;
  destination: Record<string, string>; status: string; admin_note: string | null;
  created_at: string; processed_at: string | null;
  profiles?: { email?: string; username?: string | null } | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  processing: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  cancelled: "bg-white/10 text-white/60 border-white/20",
};

const NEXT_ACTIONS: Record<string, string[]> = {
  pending: ["processing", "rejected", "cancelled"],
  processing: ["paid", "rejected"],
};

function money(cents: number) { return "$" + (cents / 100).toFixed(2); }
export default function AdminWithdrawalsPage() {
  const [rows, setRows] = useState<AdminWithdrawal[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/withdrawals" + (filter ? "?status=" + filter : ""));
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load withdrawals");
      setRows(json.withdrawals ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load withdrawals"); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function transition(id: string, status: string) {
    let note: string | undefined;
    if (status === "rejected") note = window.prompt("Reason for rejection (optional):") ?? undefined;
    setBusyId(id); setError(null);
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawal_id: id, status, admin_note: note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...json.withdrawal } : r)));
    } catch (e) { setError(e instanceof Error ? e.message : "Update failed"); }
    finally { setBusyId(null); }
  }
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Withdrawal Requests</h1>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-brand-border bg-brand-surface px-3 py-1.5 text-sm text-white">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button onClick={load} className="rounded-lg border border-brand-border bg-brand-surface px-3 py-1.5 text-sm text-white hover:bg-brand-card">Refresh</button>
        </div>
      </div>
      {error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
      )}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-brand-border bg-brand-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-brand-border text-left text-xs uppercase tracking-wide text-white/50">
              <th className="px-4 py-3">User</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Destination</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Actions</th>
            </tr>
          </thead>          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-white/50">Loading withdrawals...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-white/50">No withdrawal requests found.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-brand-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <div className="text-white">{r.profiles?.username ?? "-"}</div>
                    <div className="text-xs text-white/50">{r.profiles?.email ?? r.user_id.slice(0, 8)}</div>
                  </td>
                  <td className="px-4 py-3 text-white/80">{r.method}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-brand-gold">{money(r.amount_cents)}</div>
                    <div className="text-xs text-white/50">{r.amount_points} pts</div>
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {Object.entries(r.destination ?? {}).map(([k, v]) => (
                      <div key={k} className="text-xs"><span className="text-white/40">{k}:</span> {v}</div>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    <span className={"rounded-full border px-2 py-0.5 text-xs " + (STATUS_STYLES[r.status] ?? "")}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/60">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {(NEXT_ACTIONS[r.status] ?? []).map((action) => (
                        <button key={action} disabled={busyId === r.id} onClick={() => transition(r.id, action)}
                          className="rounded-md border border-brand-border bg-brand-surface px-2.5 py-1 text-xs text-white hover:bg-brand-bg disabled:opacity-50">
                          {action}
                        </button>
                      ))}
                      {(NEXT_ACTIONS[r.status] ?? []).length === 0 && (
                        <span className="text-xs text-white/40">No actions</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}