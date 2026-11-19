import Link from "next/link";
import { redirect } from "next/navigation";
import { normalizeReferralCode } from "@/lib/referral";

export const dynamic = "force-dynamic";

export default function HomePage({ searchParams }: { searchParams: { ref?: string } }) {
  // Support referral links that land on the root: /?ref=CODE -> /register?ref=CODE
  const ref = normalizeReferralCode(searchParams?.ref ?? null);
  if (ref) redirect("/register?ref=" + ref);
  // Static, locale-independent marketing copy. suppressHydrationWarning guards
  // against browser extensions / translation tools that mutate DOM text after SSR.
  return (
    <main suppressHydrationWarning className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 text-center">
      <h1 suppressHydrationWarning className="animate-fade-in text-4xl font-extrabold sm:text-6xl">
        <span className="text-brand-purple">Earn</span>
        <span className="text-brand-gold">Tasks</span>
      </h1>
      <p suppressHydrationWarning className="mt-4 max-w-xl text-white/60">
        Complete offers, earn Points (100 Points = $1.00), invite friends for 20% (creators earn 50%), and redeem for gaming rewards or USDT. A global rewards platform.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/register" className="rounded-xl bg-brand-purple px-6 py-3 font-semibold text-white shadow-glow transition hover:bg-brand-purple-dark">Create account</Link>
        <Link href="/login" className="rounded-xl border border-brand-border bg-brand-card px-6 py-3 font-semibold text-white/80 transition hover:text-white">Log in</Link>
      </div>
    </main>
  );
}