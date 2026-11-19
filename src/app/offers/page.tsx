"use client";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { Skeleton } from "@/components/ui/Skeleton";
interface OfferConfig { subid: string; offerwall_url: string | null; available: boolean; message: string | null; demo?: boolean }
export default function OffersPage() {
  const [config, setConfig] = useState<OfferConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/offers/config");
        const json = await res.json();
        if (res.status === 403 || (json && json.available === false)) {
          // VPN/proxy blocked or offerwall disabled: show the provider message.
          if (active) setConfig({ subid: "", offerwall_url: null, available: false, message: json?.message ?? "Offers are unavailable on this connection." });
          return;
        }
        if (!res.ok) throw new Error(json.error ?? "Failed to load offers");
        if (active) setConfig(json);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Failed to load offers"); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);
  const wallUrl = config?.offerwall_url ?? "";
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-white">Offers</h1>
        <p className="mt-1 text-white/60">Complete real offers to earn Points. Your account is identified automatically so rewards are credited to you.</p>
        {error && <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
        <div className="mt-6">
          {loading ? (
            <Skeleton className="h-[420px] w-full" />
          ) : !config?.available || !wallUrl ? (
            <div className="rounded-2xl border border-brand-border bg-brand-card p-8 text-center">
              <p className="text-lg font-semibold text-white">No offers available right now</p>
              <p className="mt-2 text-sm text-white/60">{config?.message ?? "The offer provider is temporarily unavailable. Please try again later."}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border px-4 py-3">
                <span className="text-sm text-white/60">Offerwall</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40">Your ID: {config.subid.slice(0, 8)}...</span>
                  <a href={wallUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-brand-purple px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-purple-dark">Open Offers</a>
                </div>
              </div>
              {config.demo && <p className="border-b border-brand-border bg-amber-500/10 px-4 py-2 text-xs text-amber-300">Demo mode: your rewards are simulated locally. Add real credentials to credit live conversions.</p>}
              <iframe
                src={wallUrl}
                title="CPAlead Offers"
                className="h-[80vh] min-h-[560px] w-full"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <p className="px-4 py-3 text-center text-xs text-white/40">If the offerwall does not load, tap <span className="text-brand-purple">Open Offers</span> to view it in a new tab.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
