"use client";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPointsAsDollars } from "@/lib/money";

interface Field { key: string; label: string; placeholder: string; kind: string }
interface Method { id: string; name: string; icon: string; currency_reward: string; minimum_points: number; minimum_usd: string; required_fields: Field[] }
interface WalletResp { wallet: { available_points: number } }

export default function CreatorWithdrawPage() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [available, setAvailable] = useState<number>(0);
  const [methodId, setMethodId] = useState<string>("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState<string>("500");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [w, m] = await Promise.all([
          fetch("/api/wallet").then((r) => r.json()),
          fetch("/api/creator/withdrawals").then((r) => r.json()),
        ]);
        if (!active) return;
        setAvailable((w as WalletResp).wallet?.available_points ?? 0);
        const ms: Method[] = m.methods ?? [];
        setMethods(ms);
        if (ms.length > 0) setMethodId(ms[0].id);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Failed to load"); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const method = methods.find((m) => m.id === methodId);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setSuccess(null);
    if (!method) return;
    const amountNum = Number(amount);
    if (!Number.isInteger(amountNum) || amountNum <= 0) { setError("Enter a valid whole number of points"); return; }
    if (amountNum < method.minimum_points) { setError("Minimum for " + method.name + " is " + method.minimum_points + " points"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/creator/withdrawals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: methodId, amount_points: amountNum, destination: values }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Payout request failed");
      setSuccess("Payout request submitted successfully. Our team will process it shortly.");
      setValues({});
    } catch (e) { setError(e instanceof Error ? e.message : "Payout request failed"); }
    finally { setSubmitting(false); }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold text-white">Creator Payouts</h1>
      <p className="mt-1 text-sm text-white/60">Withdraw your commission via PayPal or USDT. 100 Points = $1.00.</p>
      <p className="mt-2 text-sm text-emerald-300">Available balance: {loading ? "..." : formatPointsAsDollars(available)}</p>
      {loading ? (
        <Skeleton className="mt-6 h-80 w-full" />
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-[#16161f] p-5">
          {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
          {success && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{success}</div>}
          <div>
            <label className="mb-1 block text-sm font-medium text-white/80">Payout method</label>
            <select value={methodId} onChange={(e) => { setMethodId(e.target.value); setValues({}); }} className="w-full rounded-lg border border-white/10 bg-[#0f0f18] px-3 py-2 text-white">
              {methods.map((m) => (<option key={m.id} value={m.id}>{m.name} - min {m.minimum_points} pts (${m.minimum_usd})</option>))}
            </select>
          </div>
          {method?.required_fields.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-sm font-medium text-white/80">{field.label}</label>
              <input value={values[field.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))} placeholder={field.placeholder} className="w-full rounded-lg border border-white/10 bg-[#0f0f18] px-3 py-2 text-white" />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-sm font-medium text-white/80">Amount (Points)</label>
            <input type="number" min={method?.minimum_points ?? 500} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0f0f18] px-3 py-2 text-white" />
            <p className="mt-1 text-xs text-white/40">= {formatPointsAsDollars(Number(amount) || 0)}</p>
          </div>
          <button type="submit" disabled={submitting} className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-black hover:bg-emerald-400 disabled:opacity-60">{submitting ? "Submitting..." : "Request payout"}</button>
        </form>
      )}
    </main>
  );
}
