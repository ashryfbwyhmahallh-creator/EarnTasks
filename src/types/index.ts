export type TransactionType =
  | "CPA_REWARD" | "REFERRAL_REWARD" | "WITHDRAWAL" | "WITHDRAWAL_REVERSAL" | "ADMIN_ADJUSTMENT";
export type TransactionStatus = "pending" | "available" | "reversed" | "cancelled";

export interface Profile {
  id: string; email: string; username: string | null; referral_code: string;
  referred_by: string | null; country: string | null; is_admin: boolean;
  is_blocked: boolean; created_at: string;
}
export interface Wallet {
  user_id: string; available_points: number; pending_points: number;
  total_earned_points: number; updated_at: string;
}
export interface Transaction {
  id: string; user_id: string; type: TransactionType; status: TransactionStatus;
  points: number; reference: string | null; description: string | null;
  balance_after: number | null; created_at: string;
}
export type WithdrawalStatus = "pending" | "processing" | "paid" | "rejected" | "cancelled";
export interface Withdrawal {
  id: string; user_id: string; method: string; amount_points: number; amount_cents: number;
  destination: Record<string, string>; status: WithdrawalStatus; admin_note: string | null;
  created_at: string; processed_at: string | null;
}
export interface CpaleadConversion {
  id: string; lead_id: string; user_id: string; campaign_id: string | null;
  campaign_name: string | null; payout_cents: number; reward_points: number;
  status: string; country: string | null; event_type: string | null;
  created_at: string; processed_at: string | null;
}
export interface ApiError { error: string; code: string; details?: unknown; }