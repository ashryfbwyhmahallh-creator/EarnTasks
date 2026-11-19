// End-to-end verification for referral routing, commission split, auth, and VPN config.
// Usage: node scripts/verify.mjs  (expects the dev/prod server already running on :3000)
const BASE = process.env.VERIFY_BASE ?? "http://localhost:3000";
const results = [];
function log(label, value) { results.push(`${label} => ${value}`); console.log(`${label} => ${value}`); }

async function get(path, opts = {}) {
  const res = await fetch(BASE + path, { redirect: "manual", ...opts });
  return res;
}

async function main() {
  // 1. Health / login page renders
  let res = await get("/login");
  log("GET /login", res.status);

  // 2. Referral redirect routes
  res = await get("/r/DEMO01");
  log("GET /r/DEMO01", `${res.status} -> ${res.headers.get("location")}`);
  res = await get("/?ref=DEMO01");
  log("GET /?ref=DEMO01", `${res.status} -> ${res.headers.get("location")}`);
  res = await get("/register?ref=DEMO01");
  log("GET /register?ref=DEMO01", res.status);

  // 3. Establish a demo session (cookie)
  res = await fetch(BASE + "/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "verify@test.com", username: "verify" }),
  });
  const setCookie = res.headers.get("set-cookie") ?? "";
  const cookie = setCookie.split(";")[0];
  log("POST /api/auth/session", `${res.status} cookie=${cookie ? "yes" : "no"}`);

  const auth = { headers: { cookie } };

  // 4. API endpoints
  for (const p of ["/api/me", "/api/wallet", "/api/referrals", "/api/creator/stats", "/api/offers/config"]) {
    try {
      const r = await fetch(BASE + p, auth);
      const txt = await r.text();
      log(`GET ${p}`, `${r.status} ${txt.slice(0, 130)}`);
    } catch (e) { log(`GET ${p}`, "ERR " + e.message); }
  }

  // 5. Welcome survey double-claim guard
  try {
    const r1 = await fetch(BASE + "/api/welcome-survey", { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({ answer: "yes" }) });
    log("POST /api/welcome-survey #1", `${r1.status} ${(await r1.text()).slice(0, 110)}`);
    const r2 = await fetch(BASE + "/api/welcome-survey", { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({ answer: "yes" }) });
    log("POST /api/welcome-survey #2", `${r2.status} ${(await r2.text()).slice(0, 110)}`);
  } catch (e) { log("welcome-survey", "ERR " + e.message); }

  // 6. Regular user PayPal rejection + USDT acceptance
  try {
    const rp = await fetch(BASE + "/api/withdrawals", { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({ method: "paypal", amount_points: 500, destination: { email: "x@y.com" } }) });
    log("USER paypal (expect 400)", `${rp.status} ${(await rp.text()).slice(0, 90)}`);
    const ru = await fetch(BASE + "/api/withdrawals", { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({ method: "usdt", amount_points: 500, destination: { wallet: "TXYZ123456789abcdef" } }) });
    log("USER usdt", `${ru.status} ${(await ru.text()).slice(0, 90)}`);
  } catch (e) { log("user withdrawals", "ERR " + e.message); }

  console.log("\n===== SUMMARY =====");
  console.log(results.join("\n"));
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); }); ئئ