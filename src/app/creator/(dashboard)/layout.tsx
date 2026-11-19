import type { ReactNode } from "react";
import Link from "next/link";

// Isolated layout for the Creator / Affiliate dashboard (authenticated creators only).
// Intentionally separate from the regular user web app UI and navigation.
const NAV = [
  { href: "/creator", label: "Overview" },
  { href: "/creator/withdraw", label: "Payouts" },
];

export default function CreatorDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a12]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#12121c]/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-3">
          <Link href="/creator" className="mr-3 shrink-0 text-lg font-extrabold">
            <span className="text-emerald-400">Creator</span><span className="text-white">Hub</span>
          </Link>
          {NAV.map((l) => (
            <Link key={l.href} href={l.href} className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white">
              {l.label}
            </Link>
          ))}
          <span className="ml-auto hidden shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300 sm:block">Affiliate</span>
          <a href="/logout?to=creator" className="ml-2 shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white">Log out</a>
        </nav>
      </header>
      {children}
    </div>
  );
}

