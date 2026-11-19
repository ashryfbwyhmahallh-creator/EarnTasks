"use client";
import { useCallback, useEffect, useState } from "react";

interface AdminUser {
  id: string; email: string; username: string | null; referral_code: string;
  country: string | null; is_admin: boolean; is_blocked: boolean; created_at: string;
  last_sign_in_at: string | null; inactive: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [inactiveOnly, setInactiveOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (inactiveOnly) params.set("inactive", "1");
      const res = await fetch("/api/admin/users" + (params.toString() ? "?" + params.toString() : ""));
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load users");
      setUsers(json.users ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load users"); }
    finally { setLoading(false); }
  }, [q, inactiveOnly]);

  useEffect(() => { load(); }, [load]);

  async function toggleBlock(u: AdminUser) {
    setBusyId(u.id); setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: u.id, is_blocked: !u.is_blocked }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_blocked: json.user.is_blocked } : x)));
    } catch (e) { setError(e instanceof Error ? e.message : "Update failed"); }
    finally { setBusyId(null); }
  }

  const inactiveCount = users.filter((u) => u.inactive).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email, username, code..."
            className="rounded-lg border border-brand-border bg-brand-surface px-3 py-1.5 text-sm text-white" />
          <button onClick={load} className="rounded-lg border border-brand-border bg-brand-surface px-3 py-1.5 text-sm text-white hover:bg-brand-card">Search</button>
          <label className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-200">
            <input type="checkbox" checked={inactiveOnly} onChange={(e) => setInactiveOnly(e.target.checked)} />
            Inactive 7+ days
          </label>
        </div>
      </div>
      <p className="mt-2 text-sm text-white/50">
        Showing {users.length} user{users.length === 1 ? "" : "s"}{inactiveCount > 0 ? " (" + inactiveCount + " inactive 7+ days)" : ""}. Use the inactive users emails below to reach out.
      </p>
      {error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
      )}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-brand-border bg-brand-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-brand-border text-left text-xs uppercase tracking-wide text-white/50">
              <th className="px-4 py-3">User</th><th className="px-4 py-3">Referral code</th><th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Last sign-in</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-white/50">Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-white/50">{inactiveOnly ? "No inactive users. Everyone has signed in within the last 7 days." : "No users found."}</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-brand-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <div className="text-white">{u.username ?? "-"}</div>
                    <div className="text-xs text-white/50">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-white/70">{u.referral_code}</td>
                  <td className="px-4 py-3 text-white/70">{u.country ?? "-"}</td>
                  <td className="px-4 py-3 text-xs">
                    {u.last_sign_in_at ? (
                      <span className={u.inactive ? "text-amber-300" : "text-white/70"}>
                        {new Date(u.last_sign_in_at).toLocaleDateString()}{u.inactive ? " (inactive)" : ""}
                      </span>
                    ) : (
                      <span className="text-white/40">Never</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={"rounded-full border px-2 py-0.5 text-xs " + (u.is_admin ? "border-brand-gold/40 bg-brand-gold/10 text-brand-gold" : "border-brand-border text-white/60")}>
                      {u.is_admin ? "Admin" : "User"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={"rounded-full border px-2 py-0.5 text-xs " + (u.is_blocked ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300")}>
                      {u.is_blocked ? "Blocked" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button disabled={busyId === u.id} onClick={() => toggleBlock(u)}
                      className="rounded-md border border-brand-border bg-brand-surface px-2.5 py-1 text-xs text-white hover:bg-brand-bg disabled:opacity-50">
                      {u.is_blocked ? "Unblock" : "Block"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
