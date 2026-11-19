const fs = require("fs");
const f = "src/app/dashboard/page.tsx";
let s = fs.readFileSync(f, "utf8");
const before = s;

if (!s.includes("const [loading, setLoading]")) {
  s = s.replace(
    /const \[error, setError\] = useState<string \| null>\(null\);/,
    "const [error, setError] = useState<string | null>(null);\n  const [loading, setLoading] = useState(true);"
  );
}

s = s.replace(
  /catch \(e) \ { if \(active\) setError\(e instanceof Error \ ? e.message : "Failed to load"); \}/,
  'catch (e) { if (active) setError(e instanceof Error ? e.message : "Failed to load dashboard data"); } finally { if (active) setLoading(false); }'
);

s = s.replace(
  /\) : \(\s*Array\.from\(\y length: 4 \}\).map\(\(_, i\) => <Skeleton key=\{i\} className="h-\[92px\]" \/>\)\s*\)\}/,
  ') : loading ? (\n            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />)\n          ) : (\n            <div className="col-span-2 rounded-2xl border border-brand-border bg-brand-card p-6 text-center text-white/60 lg:col-span-4">Could not load your balance. Please refresh, or contact support if this persists.</div>\n          )}'
);

if (s === before) { console.log("NO_CHAGES_APPLIED"); process.exit(2); }
fs.writeFileSync(f, s);
console.log("DATHBOARD_PATCHED len=" + s.length + " hasLoading=" + s.includes("const [loading, setLoading]"));
