import "server-only";

// In-memory fallback backend used ONLY when Supabase is not configured.
// Starts completely empty: no seed users, balances, transactions, or referrals.
export const DEMO_USER_ID = "demo-user-0001";
export const DEMO_EMAIL = "demo@earntasks.local";

export interface DemoProfile {
  id: string; email: string; username: string; referral_code: string;
  referred_by: string | null; country: string; is_admin: boolean; is_creator: boolean; created_at: string;
}
export interface DemoWallet { user_id: string; available_points: number; pending_points: number; total_earned_points: number; updated_at: string; }
export interface DemoTransaction { id: string; user_id: string; type: string; status: string; points: number; reference: string | null; description: string | null; balance_after: number; created_at: string; }
export interface DemoWithdrawal { id: string; user_id: string; method: string; amount_points: number; amount_cents: number; destination: Record<string, string>; status: string; admin_note: string | null; created_at: string; processed_at: string | null; }
export interface DemoProof { id: string; withdrawal_id: string; user_id: string; phone_number: string; proof_url: string; note: string | null; status: string; created_at: string; }
export interface DemoReferral { id: string; referrer_id: string; referred_id: string; referred_email: string; status: string; created_at: string; }

interface DemoState {
  profile: DemoProfile;
  wallet: DemoWallet;
  transactions: DemoTransaction[];
  withdrawals: DemoWithdrawal[];
  proofs: DemoProof[];
  referrals: DemoReferral[];
  surveyClaimed: boolean;
}

// A clean slate: zero balances, no transactions, no referrals.
export function resetDemoState(email = DEMO_EMAIL, username = "creator"): DemoState {
  return {
    profile: {
      id: DEMO_USER_ID, email, username, referral_code: "DEMO01",
      referred_by: null, country: "", is_admin: false, is_creator: true,
      created_at: new Date().toISOString(),
    },
    wallet: { user_id: DEMO_USER_ID, available_points: 0, pending_points: 0, total_earned_points: 0, updated_at: new Date().toISOString() },
    transactions: [],
    withdrawals: [],
    proofs: [],
    referrals: [],
    surveyClaimed: false,
  };
}

const g = globalThis as unknown as { __earntasksDemo?: DemoState };
export function getDemoState(): DemoState {
  if (!g.__earntasksDemo) g.__earntasksDemo = resetDemoState();
  return g.__earntasksDemo;
}

export function demoAddLedger(tx: { type: string; status: string; points: number; reference?: string | null; description?: string | null }): DemoTransaction {
  const s = getDemoState();
  s.wallet.available_points += tx.status === "available" ? tx.points : 0;
  s.wallet.pending_points += tx.status === "pending" ? tx.points : 0;
  if (tx.status === "available" && tx.points > 0) s.wallet.total_earned_points += tx.points;
  s.wallet.updated_at = new Date().toISOString();
  const row: DemoTransaction = {
    id: "demo-tx-" + s.transactions.length + "-" + Date.now(),
    user_id: DEMO_USER_ID, type: tx.type, status: tx.status, points: tx.points,
    reference: tx.reference ?? null, description: tx.description ?? null,
    balance_after: s.wallet.available_points, created_at: new Date().toISOString(),
  };
  s.transactions.unshift(row);
  return row;
}

export function demoAddReferral(email: string, status = "active"): DemoReferral {
  const s = getDemoState();
  const id = "demo-ref-" + (s.referrals?.length ?? 0) + "-" + Date.now();
  const row: DemoReferral = { id, referrer_id: DEMO_USER_ID, referred_id: "demo-referred-" + Date.now(), referred_email: email, status, created_at: new Date().toISOString() };
  if (!s.referrals) s.referrals = [];
  s.referrals.unshift(row);
  return row;
}