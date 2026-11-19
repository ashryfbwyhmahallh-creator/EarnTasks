"use client";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { USER_WITHDRAWAL_METHODS, type WithdrawalMethod } from "@/lib/withdrawalMethods";
import { formatPointsAsDollars, formatCents } from "@/lib/money";
import type { Withdrawal } from "@/types";
interface WalletResp { wallet: { available_points: number; pending_points: number } }
const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  processing: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  cancelled: "bg-white/10 text-white/60 border-white/20",
};
export default function WithdrawPage() {
  const [wallet, setWallet] = useState<WalletResp["wallet"] | null>(null);
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [selected, setSelected] = useState<WithdrawalMethod | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  async function load() {
    try {
      const [w, h] = await Promise.all([
        fetch("/api/wallet").then((r) => r.json()),
        fetch("/api/withdrawals").then((r) => r.json()),
      ]);
      if (w.error) throw new Error(w.error);
      setWallet(w.wallet); setHistory(h.withdrawals ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  function pick(m: WithdrawalMethod) {
    setSelected(m); setValues({}); setAmount(String(m.minimum_points)); setError(null); setSuccess(null);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setSuccess(null);
    if (!selected) return;
    const amountPoints = Math.floor(Number(amount));
    if (!Number.isFinite(amountPoints) || amountPoints <= 0) { setError("Enter a valid whole number of Points"); return; }
    if (amountPoints < selected.minimum_points) { setError("Minimum for " + selected.name + " is " + selected.minimum_points + " Points ($" + selected.minimum_usd + ")"); return; }
    if (wallet && amountPoints > wallet.available_points) { setError("Amount exceeds your available balance"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: selected.id, amount_points: amountPoints, destination: values }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Withdrawal failed");
      setSuccess("Withdrawal request submitted. Status: Pending.");
      setSelected(null); setValues({}); setAmount("");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Withdrawal failed"); }
    finally { setSubmitting(false); }
  }
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-white">Withdraw</h1>
        <p className="mt-1 text-white/60">Redeem your Points for gaming rewards or USDT. 100 Points = $1.00.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg border border-brand-gold/30 bg-brand-gold/10 px-3 py-1.5 text-brand-gold">Available: {wallet ? wallet.available_points + " Points (" + formatPointsAsDollars(wallet.available_points) + ")" : "-"}</span>
          <span className="rounded-lg border border-brand-blue/30 bg-brand-blue/10 px-3 py-1.5 text-brand-blue">Pending: {wallet ? wallet.pending_points + " Points (" + formatPointsAsDollars(wallet.pending_points) + ")" : "-"}</span>
        </div>
        {error && <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
        {success && <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{success}</div>}
        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          {USER_WITHDRAWAL_METHODS.filter((m) => m.enabled).map((m) => (
            <button key={m.id} onClick={() => pick(m)}
              className={"animate-fade-in flex items-center gap-4 rounded-2xl border p-4 text-left transition " + (selected?.id === m.id ? "border-brand-purple bg-brand-purple/10 shadow-glow" : "border-brand-border bg-brand-card hover:border-brand-purple/50")}>
              <span className="text-3xl">{m.icon}</span>
              <div>
                <div className="font-semibold text-white">{m.name}</div>
                <div className="text-sm text-white/60">{m.currency_reward}</div>
                <div className="text-xs text-brand-gold">Minimum: ${m.minimum_usd} / {m.minimum_points} Points</div>
              </div>
            </button>
          ))}
        </section>
        {selected && (
          <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-brand-border bg-brand-card p-5">
            <h2 className="font-semibold text-white">{selected.icon} {selected.name} - {selected.currency_reward}</h2>
            {selected.required_fields.map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-sm text-white/80">{f.label}</label>
                <input type={f.kind === "email" ? "email" : "text"} value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-white" />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-sm text-white/80">Amount (Points) - min {selected.minimum_points} (${selected.minimum_usd})</label>
              <input type="number" min={selected.minimum_points} max={wallet?.available_points ?? undefined} step={1} value={amount}
                onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-white" />
              {amount && Number(amount) > 0 && (
                <p className="mt-1 text-xs text-white/50">You will receive {formatCents(Math.floor(Number(amount)))} worth ({Number(amount)} Points)</p>
              )}
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="rounded-lg bg-brand-purple px-5 py-2.5 font-semibold text-white hover:bg-brand-purple-dark disabled:opacity-60">{submitting ? "Submitting..." : "Request withdrawal"}</button>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-brand-border bg-brand-surface px-5 py-2.5 text-white/70 hover:text-white">Cancel</button>
            </div>
            <p className="text-xs text-white/40">Requests start as Pending and are reviewed by our team. Points are held while a request is processed and refunded if it is rejected.</p>
          </form>
        )}
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-white">Your withdrawal requests</h2>
          {loading ? (
            <div className="rounded-2xl border border-brand-border bg-brand-card p-6 text-center text-white/50">Loading...</div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl border border-brand-border bg-brand-card p-6 text-center text-white/50">No withdrawal requests yet.</div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border text-left text-xs uppercase text-white/50">
                    <th className="px-4 py-3">Date</th><th className="px-4 py-3">Method</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b border-brand-border/60 last:border-0">
                      <td className="px-4 py-3 text-white/60">{new Date(h.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 capitalize text-white/80">{h.method.replace("_", " ")}</td>
                      <td className="px-4 py-3 text-right font-medium text-brand-gold">{formatCents(h.amount_cents)} <span className="text-white/40">({h.amount_points} pts)</span></td>
                      <td className="px-4 py-3"><span className={"rounded-full border px-2 py-0.5 text-xs " + (STATUS_STYLES[h.status] ?? "")}>{h.status}</span></td>
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