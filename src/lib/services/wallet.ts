import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import type { TransactionType, TransactionStatus } from "@/types";
interface LedgerInput {
  userId: string; type: TransactionType; status: TransactionStatus;
  points: number; reference?: string | null; description?: string | null;
}
export async function applyLedger(admin: SupabaseClient, input: LedgerInput) {
  const { data, error } = await admin.rpc("apply_wallet_transaction", {
    p_user_id: input.userId, p_type: input.type, p_status: input.status,
    p_points: input.points, p_reference: input.reference ?? null, p_description: input.description ?? null,
  });
  if (error) throw new AppError(error.message, "WALLET_ERROR", 500);
  return data as { transaction_id: string; available_points: number; pending_points: number };
}
export async function getWallet(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin.from("wallets").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new AppError(error.message, "WALLET_ERROR", 500);
  if (data) return data;
  const { data: created, error: cErr } = await admin
    .from("wallets").upsert({ user_id: userId }, { onConflict: "user_id" }).select("*").single();
  if (cErr) throw new AppError(cErr.message, "WALLET_ERROR", 500);
  return created;
}