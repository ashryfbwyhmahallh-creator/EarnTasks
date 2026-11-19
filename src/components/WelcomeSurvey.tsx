"use client";
import { useEffect, useState } from "react";

type Lang = "en" | "ar";

const COPY: Record<Lang, { title: string; question: string; yes: string; no: string; claim: string; reward: string; thanks: string; done: string }> = {
  en: {
    title: "Welcome to EarnTasks!",
    question: "Do you use Facebook?",
    yes: "Yes",
    no: "No",
    claim: "Claim reward",
    reward: "Answer to earn 50 Points ($0.50)",
    thanks: "Thanks! You earned 50 Points ($0.50).",
    done: "Done",
  },
  ar: {
    title: "!مرحبا بك في EarnTasks",
    question: "هل تستخدم فيسبوك؟",
    yes: "نعم",
    no: "لا",
    claim: "احصل على المكافأة",
    reward: "أجب لتربح 50 نقطة (0.50 دولار)",
    thanks: "شكرا! لقد ربحت 50 نقطة (0.50 دولار).",
    done: "تم",
  },
};

export function WelcomeSurvey() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rewarded, setRewarded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/welcome-survey");
        const text = await res.text();
        let json: { claimed?: boolean } | null = null;
        try { json = text ? JSON.parse(text) : null; } catch { json = null; }
        if (!active) return;
        if (res.ok && json && !json.claimed) setOpen(true);
      } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, []);

  async function claim() {
    if (!answer) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/welcome-survey", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      // Read as text first so an HTML error page never throws a JSON parse error.
      const text = await res.text();
      let json: { error?: string; already_claimed?: boolean; reward_points?: number } | null = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      if (!res.ok || json === null) {
        if (json?.error) throw new Error(json.error);
        throw new Error(`Could not claim your reward (server returned ${res.status}). Please try again in a moment.`);
      }
      setRewarded(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to claim reward"); }
    finally { setSubmitting(false); }
  }

  if (!open) return null;
  const t = COPY[lang];
  const rtl = lang === "ar";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir={rtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-md rounded-2xl border border-brand-border bg-brand-card p-6 shadow-xl animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{t.title}</h2>
          <div className="flex gap-1">
            <button onClick={() => setLang("en")} className={"rounded px-2 py-1 text-xs " + (lang === "en" ? "bg-brand-purple/30 text-white" : "text-white/50")}>EN</button>
            <button onClick={() => setLang("ar")} className={"rounded px-2 py-1 text-xs " + (lang === "ar" ? "bg-brand-purple/30 text-white" : "text-white/50")}>AR</button>
          </div>
        </div>
        {rewarded ? (
          <div className="mt-6 text-center">
            <p className="text-lg font-semibold text-emerald-300">{t.thanks}</p>
            <button onClick={() => setOpen(false)} className="mt-4 w-full rounded-lg bg-brand-purple px-4 py-2.5 font-semibold text-white hover:bg-brand-purple-dark">{t.done}</button>
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-col items-center gap-3">
              <svg viewBox="0 0 36 36" className="h-12 w-12" aria-hidden="true">
                <path fill="#1877F2" d="M36 18a18 18 0 1 0-20.8 17.8v-12.6h-4.5V18h4.5v-3.9c0-4.5 2.7-7 6.8-7 2 0 4 .35 4 .35v4.4h-2.3c-2.2 0-2.9 1.4-2.9 2.8V18h5l-.8 5.2h-4.2v12.6A18 18 0 0 0 36 18z"/>
                <path fill="#fff" d="M25 23.2l.8-5.2h-5v-3.4c0-1.4.7-2.8 2.9-2.8h2.3v-4.4s-2-.35-4-.35c-4.1 0-6.8 2.5-6.8 7V18h-4.5v5.2h4.5v12.6a18 18 0 0 0 5.6 0V23.2h4.2z"/>
              </svg>
              <p className="text-center text-lg font-semibold text-white">{t.question}</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={() => setAnswer("yes")} className={"rounded-lg border px-4 py-3 font-semibold transition " + (answer === "yes" ? "border-brand-purple bg-brand-purple/20 text-white" : "border-brand-border text-white/70 hover:text-white")}>{t.yes}</button>
              <button onClick={() => setAnswer("no")} className={"rounded-lg border px-4 py-3 font-semibold transition " + (answer === "no" ? "border-brand-purple bg-brand-purple/20 text-white" : "border-brand-border text-white/70 hover:text-white")}>{t.no}</button>
            </div>
            <p className="mt-3 text-center text-xs text-brand-gold">{t.reward}</p>
            {error && <p className="mt-2 text-center text-sm text-red-300">{error}</p>}
            <button onClick={claim} disabled={!answer || submitting} className="mt-4 w-full rounded-lg bg-brand-purple px-4 py-2.5 font-semibold text-white hover:bg-brand-purple-dark disabled:opacity-60">{submitting ? "..." : t.claim}</button>
          </>
        )}
      </div>
    </div>
  );
}
