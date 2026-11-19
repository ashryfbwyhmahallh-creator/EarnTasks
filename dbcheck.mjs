import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/).filter((l) => l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const url = env["NEXT_PUBLIC_SUPABASE_URL"];
const key = env["SUPABASE_SERVICE_ROLE_KEY"];
const out = [];
out.push("supabase-js version = " + JSON.parse(fs.readFileSync("node_modules/@supabase/supabase-js/package.json", "utf8")).version);
out.push("url set = " + !!url + " | service key set = " + !!key);

if (!url || !key) { fs.writeFileSync("dbcheck_out.txt", out.join("\n"), "utf8"); process.exit(0); }

let admin;
try {
  admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  out.push("createClient = OK");
} catch (e) {
  out.push("createClient FAILED: " + e.message);
  fs.writeFileSync("dbcheck_out.txt", out.join("\n"), "utf8");
  process.exit(0);
}

const tables = ["profiles", "wallets", "transactions", "welcome_survey_responses", "cpalead_conversions", "withdrawals", "referrals", "platform_settings"];
for (const t of tables) {
  const { error } = await admin.from(t).select("*").limit(1);
  out.push(t + " -> " + (error ? ("ERR " + error.code + " " + error.message) : "OK"));
}

fs.writeFileSync("dbcheck_out.txt", out.join("\n"), "utf8");
process.exit(0);