import type { ReactNode } from "react";
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-brand-border bg-brand-card p-5 shadow-lg ${className}`}>{children}</div>;
}
export function StatCard({ label, value, accent = "purple", hint }: {
  label: string; value: string; accent?: "purple" | "blue" | "gold"; hint?: string;
}) {
  const accentMap = { purple: "text-brand-purple", blue: "text-brand-blue", gold: "text-brand-gold" } as const;
  return (
    <Card className="animate-fade-in">
      <p className="text-xs uppercase tracking-wide text-white/50">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accentMap[accent]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </Card>
  );
}