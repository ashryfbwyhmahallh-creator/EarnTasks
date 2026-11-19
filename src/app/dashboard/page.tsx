"use client";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { StatCard } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { WelcomeSurvey } from "@/components/WelcomeSurvey";
import { formatPointsAsDollars } from "@/lib/money";
interface WalletResp { wallet: { available_points: number; pending_points: number; total_earned_points: number } }
interface ReferralResp { referral_code: string; referral_link: string; referred_count: number; total_referral_points: number }
export default function DashboardPage() {
  const [wallet, setWallet] = useState<WalletResp["wallet"] | null>(null);
  const [referral, setReferral] = useState<ReferralResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [w, r] = await Promise.all([
          fetch("/api/wallet").then((res) => res.json()),
          fetch("/api/referrals").then((res) => res.json()),
        ]);
        if (!active) return;
        if (w.error) throw new Error(w.error);
                setWallet(w.wallet); setReferral(r);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Failed to load dashboard data"); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);
  return (
    <>
      <NavBar />
      <WelcomeSurvey />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="animate-fade-in rounded-3xl border border-brand-border bg-gradient-to-br from-brand-card via-brand-surface to-brand-bg p-6 shadow-glow sm:p-8">
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Complete offers. Earn Points. Get rewarded.</h1>
          <p className="mt-2 max-w-2xl text-white/60">
            EarnTasks is a global rewards platform. Complete real offers from our partner, earn Points (100 Points = $1.00),
            invite friends to earn 20% of their earnings (creators earn 50%), and redeem for gaming rewards or USDT.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/offers" className="rounded-xl bg-brand-purple px-5 py-2.5 font-semibold text-white shadow-glow transition hover:bg-brand-purple-dark">Start earning</a>
            <a href="/withdraw" className="rounded-xl border border-brand-gold/40 bg-brand-gold/10 px-5 py-2.5 font-semibold text-brand-gold transition hover:bg-brand-gold/20">Withdraw</a>
          </div>
        </section>
        {error && <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {wallet ? (
            <>
              <StatCard label="Available" value={formatPointsAsDollars(wallet.available_points)} accent="gold" hint={wallet.available_points + " Points"} />
              <StatCard label="Pending" value={formatPointsAsDollars(wallet.pending_points)} accent="blue" hint={wallet.pending_points + " Points"} />
              <StatCard label="Total earned" value={formatPointsAsDollars(wallet.total_earned_points)} accent="purple" hint={wallet.total_earned_points + " Points"} />
              <StatCard label="Referral earnings" value={referral ? formatPointsAsDollars(referral.total_referral_points) : "$0.00"} accent="purple" hint={referral ? referral.referred_count + " referred" : undefined} />
            </>
                    ) : loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />)
          ) : (
            <div className="col-span-2 rounded-2xl border border-brand-border bg-brand-card p-6 text-center text-white/60 lg:col-span-4">Could not load your balance. Please refresh, or contact support if this persists.</div>
          )}
        </section>
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Step n={1} title="Complete offers" text="Browse the CPAlead wall and finish tasks that match your country and device." />
          <Step n={2} title="Earn Points" text="Confirmed conversions are credited to your wallet. 100 Points = $1.00." />
          <Step n={3} title="Invite & redeem" text="Earn 20% of your referrals' earnings (creators 50%), then withdraw to gaming rewards or USDT." />
        </section>
      </main>
    </>
  );
}
function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="animate-fade-in rounded-2xl border border-brand-border bg-brand-card p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-purple/20 font-bold text-brand-purple">{n}</div>
      <h3 className="mt-3 font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-white/60">{text}</p>
    </div>
  );
}