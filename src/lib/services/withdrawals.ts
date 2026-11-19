import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import { getWithdrawalMethod, type WithdrawalAudience } from "@/lib/withdrawalMethods";
import { pointsToCents } from "@/lib/money";
import { applyLedger } from "@/lib/services/wallet";
export interface CreateWithdrawalInput {
  userId: string; method: string; amountPoints: number; destination: Record<string, string>;
  audience?: WithdrawalAudience;
}
export async function createWithdrawal(admin: SupabaseClient, input: CreateWithdrawalInput) {
  const audience = input.audience ?? "user";
  const method = getWithdrawalMethod(input.method, audience);
  if (!method) throw new AppError("Unknown or disabled withdrawal method", "BAD_METHOD", 400);
  if (!Number.isInteger(input.amountPoints) || input.amountPoints <= 0) {
    throw new AppError("Amount must be a positive whole number of points", "BAD_AMOUNT", 400);
  }
  if (input.amountPoints < method.minimum_points) {
    throw new AppError(
      `Minimum withdrawal for ${method.name} is ${method.minimum_points} points ($${method.minimum_usd})`,
      "BELOW_MINIMUM", 400);
  }
  for (const field of method.required_fields) {
    const val = input.destination[field.key]?.trim();
    if (!val) throw new AppError(`${field.label} is required`, "MISSING_FIELD", 400);
    if (field.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      throw new AppError("Invalid PayPal email", "BAD_EMAIL", 400);
    }
    if (field.kind === "player_id" && !/^[A-Za-z0-9._-]{3,64}$/.test(val)) {
      throw new AppError(`Invalid ${field.label}`, "BAD_PLAYER_ID", 400);
    }
  }
  const { data: wallet } = await admin.from("wallets").select("available_points").eq("user_id", input.userId).maybeSingle();
  if (!wallet) throw new AppError("Wallet not found", "NO_WALLET", 400);
  if (wallet.available_points < input.amountPoints) {
    throw new AppError("Insufficient available balance", "INSUFFICIENT", 400);
  }
  const amountCents = pointsToCents(input.amountPoints);
  const { data: wd, error } = await admin
    .from("withdrawals")
    .insert({
      user_id: input.userId, method: method.id, amount_points: input.amountPoints,
      amount_cents: amountCents, destination: input.destination, status: "pending",
    })
    .select("*").single();
  if (error) throw new AppError(error.message, "WD_CREATE_FAILED", 500);
  await applyLedger(admin, {
    userId: input.userId, type: "WITHDRAWAL", status: "available",
    points: -input.amountPoints, reference: wd.id, description: `Withdrawal request: ${method.name}`,
  });
  return wd;
}
