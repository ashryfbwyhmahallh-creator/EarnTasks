"use client";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { createClient } from "@/lib/supabase/client";
import { payoutProofSchema } from "@/lib/validation/proof";
import { formatCents } from "@/lib/money";
import type { Withdrawal } from "@/types";
interface ProofRow { id: string; withdrawal_id: string; phone_number: string; proof_url: string; note: string | null; status: string; created_at: string }
export default function PayoutProofPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [existing, setExisting] = useState<Record<string, ProofRow>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ withdrawal_id: "", phone_number: "", proof_url: "", note: "" });
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = "/login"; return; }
        const [wdRes, proofsRes] = await Promise.all([
          // mock or real client result
          supabase.from("withdrawals").select("*").in("status", ["pending", "processing"]).order("created_at", { ascending: false }),
          fetch("/api/proofs").then((r) => r.json()),
        ]);
        const w = (wdRes as { data: Withdrawal[] | null }).data;
        if (!active) return;
        setWithdrawals((w as Withdrawal[]) ?? []);
        const map: Record<string, ProofRow> = {};
        for (const p of (proofsRes.proofs as ProofRow[]) ?? []) map[p.withdrawal_id] = p;
        setExisting(map);
        if ((w ?? []).length > 0) setForm((f) => ({ ...f, withdrawal_id: (w as Withdrawal[])[0].id }));
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Failed to load data"); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setSuccess(null);
    const parsed = payoutProofSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/proofs", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Submission failed");
      setExisting((prev) => ({ ...prev, [json.proof.withdrawal_id]: json.proof }));
      setSuccess("Proof submitted. Our team will review it shortly.");
      setForm((f) => ({ ...f, proof_url: "", note: "" }));
    } catch (e) { setError(e instanceof Error ? e.message : "Submission failed"); }
    finally { setSubmitting(false); }
  }
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-xl px-4 py-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-white">Submit Payout Proof</h1>
        <p className="mt-1 text-sm text-white/60">Share a screenshot or video link and your phone number so we can verify your payout.</p>
        {loading ? (
          <p className="mt-6 text-white/60">Loading...</p>
        ) : withdrawals.length === 0 ? (
          <div className="mt-6 rounded-xl border border-brand-border bg-brand-card p-6 text-white/70">You have no pending or processing withdrawals. Submit a withdrawal request first.</div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-brand-border bg-brand-card p-5">
            {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
            {success && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{success}</div>}
            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">Withdrawal</label>
              <select value={form.withdrawal_id} onChange={(e) => setForm((f) => ({ ...f, withdrawal_id: e.target.value }))} className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-white">
                {withdrawals.map((w) => (<option key={w.id} value={w.id}>{w.method} - {formatCents(w.amount_cents)} ({w.status})</option>))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">Phone number</label>
              <input type="tel" value={form.phone_number} onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))} placeholder="+1 555 123 4567" className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-white" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">Screenshot / video link</label>
              <input type="url" value={form.proof_url} onChange={(e) => setForm((f) => ({ ...f, proof_url: e.target.value }))} placeholder="https://..." className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-white" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">Note (optional)</label>
              <textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} rows={3} maxLength={500} className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-white" />
            </div>
            <button type="submit" disabled={submitting} className="w-full rounded-lg bg-brand-purple px-4 py-2.5 font-semibold text-white transition hover:bg-brand-purple-dark disabled:opacity-60">{submitting ? "Submitting..." : "Submit proof"}</button>
            {existing[form.withdrawal_id] && <p className="text-xs text-white/50">A proof was already submitted for this withdrawal and will be replaced on resubmit.</p>}
          </form>
        )}
      </main>
    </>
  );
}
