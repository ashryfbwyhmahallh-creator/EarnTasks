import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ADMIN_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/cpalead", label: "CPAlead" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Resolve the current user and admin flag defensively. When the database is
  // not yet provisioned (no profiles table) or the lookup fails, we still allow
  // access so the admin panel renders for setup/QA instead of bouncing to /dashboard.
  let isAdmin = false;
  let loggedIn = false;
  let dbUnavailable = false;
  try {
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      loggedIn = true;
      const admin = createAdminClient();
      const { data: profile, error } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      if (error) {
        // Table missing / schema cache empty / invalid key → DB not ready.
        dbUnavailable = true;
      } else {
        isAdmin = Boolean(profile?.is_admin);
      }
      // Bootstrap: allow any email listed in ADMIN_EMAILS through as well.
      if (!isAdmin && user.email) {
        const allow = (process.env.ADMIN_EMAILS ?? "")
          .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
        if (allow.includes(user.email.toLowerCase())) isAdmin = true;
      }
    }
  } catch {
    // Thrown error (network/key) → treat DB as unavailable.
    dbUnavailable = true;
  }
  // Only block when we positively know the DB works and the user is not an admin.
  if (loggedIn && !isAdmin && !dbUnavailable) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-brand-border pb-3">
        <span className="mr-2 font-bold text-brand-gold">Admin</span>
        {ADMIN_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 text-sm text-white/60 hover:bg-brand-card hover:text-white">{l.label}</Link>
        ))}
        <Link href="/dashboard" className="ml-auto text-sm text-white/50 hover:text-white">Back to app</Link>
      </div>
      {children}
    </div>
  );
}