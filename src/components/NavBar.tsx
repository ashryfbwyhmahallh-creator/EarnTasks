"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/offers", label: "Offers" },
  { href: "/referral", label: "Referral" },
  { href: "/creator", label: "Creator" },
  { href: "/withdraw", label: "Withdraw" },
  { href: "/account", label: "Account" },
];
export function NavBar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;
  return (
    <header className="sticky top-0 z-40 border-b border-brand-border bg-brand-bg/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-3">
        <Link href="/dashboard" className="mr-3 shrink-0 text-lg font-extrabold">
          <span className="text-brand-purple">Earn</span><span className="text-brand-gold">Tasks</span>
        </Link>
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link key={l.href} href={l.href}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition ${active ? "bg-brand-purple/20 text-white" : "text-white/60 hover:text-white"}`}>
              {l.label}
            </Link>
          );
        })}
        <form action="/logout" method="post" className="ml-auto shrink-0">
          <button type="submit" className="rounded-lg px-3 py-1.5 text-sm text-white/60 hover:text-white">Log out</button>
        </form>
      </nav>
    </header>
  );
}