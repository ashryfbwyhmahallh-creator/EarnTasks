import type { SupabaseClient } from "@supabase/supabase-js";
import { applyPercentage } from "@/lib/money";
import { applyLedger } from "@/lib/services/wallet";
import { serverConfig } from "@/lib/config";
import { AppError } from "@/lib/errors";
export interface PostbackInput {
  subid: string; lead_id: string; campaign_id?: string | null; campaign_name?: string | null;
  payout: string; event_type?: string | null; country?: string | null;
}
export function parsePayoutToCents(payout: string): number {
  const raw = String(payout).trim().replace(/^\$/, "");
  if (!/^\d+(\.\d{1,4})?$/.test(raw)) throw new AppError(`Invalid payout value: ${payout}`, "INVALID_PAYOUT", 400);
  const [whole, frac = ""] = raw.split(".");
  const fracPadded = (frac + "0000").slice(0, 4);
  const wholeCents = BigInt(whole) * BigInt(100);
  const fracCents = BigInt(fracPadded.slice(0, 2));
  const roundUp = Number(fracPadded[2] ?? "0") >= 5 ? BigInt(1) : BigInt(0);
  const cents = Number(wholeCents + fracCents + roundUp);
  if (!Number.isSafeInteger(cents)) throw new AppError("payout too large", "INVALID_PAYOUT", 400);
  return cents;
}
export function isReversalEvent(eventType?: string | null): boolean {
  if (!eventType) return false;
  return ["reversal", "reversed", "chargeback", "refund", "void"].includes(eventType.toLowerCase());
}
export function isConfirmedEvent(eventType?: string | null): boolean {
  if (!eventType) return true;
  const t = eventType.toLowerCase();
  if (["reversal", "reversed", "chargeback", "refund", "void"].includes(t)) return false;
  if (["pending", "hold", "unconfirmed"].includes(t)) return false;
  return true;
}
export interface ConversionResult {
  duplicate: boolean; credited: boolean; points: number;
  referralPoints?: number; commissionPercent?: number;
}

// Processes a CPAlead postback. Credits the user and the referrer
// (creator 50% / regular user 20% of the user's EARNED POINTS) inside a single
// atomic database transaction so earned funds are never lost.
export async function processConversion(admin: SupabaseClient, input: PostbackInput): Promise<ConversionResult> {
  const payoutCents = parsePayoutToCents(input.payout);
  const { data: user } = await admin
    .from("profiles").select("id, referred_by, is_blocked").eq("id", input.subid).maybeSingle();
  if (!user) throw new AppError("Unknown subid (user does not exist)", "UNKNOWN_USER", 404);
  if (user.is_blocked) throw new AppError("User is blocked", "USER_BLOCKED", 403);

  const rewardPoints = applyPercentage(payoutCents, serverConfig.cpaRewardPercentage);
  const reversal = isReversalEvent(input.event_type);
  const confirmed = isConfirmedEvent(input.event_type);

  // Reversals are handled separately (debit the original credit if any).
  if (reversal) {
    const { data: priorCredit } = await admin
      .from("transactions").select("id, points").eq("reference", input.lead_id).eq("type", "CPA_REWARD").maybeSingle();
    if (priorCredit) {
      await applyLedger(admin, {
        userId: input.subid, type: "WITHDRAWAL_REVERSAL", status: "available",
        points: -Math.abs(priorCredit.points), reference: input.lead_id, description: "CPAlead reversal",
      });
    }
    // Best-effort record of the reversal conversion (ignored if duplicate).
    await admin.from("cpalead_conversions").insert({
      lead_id: input.lead_id, user_id: input.subid, campaign_id: input.campaign_id ?? null,
      campaign_name: input.campaign_name ?? null, payout_cents: payoutCents, reward_points: 0,
      status: "reversed", country: input.country ?? null, event_type: input.event_type ?? null,
      processed_at: new Date().toISOString(),
    }).then(() => undefined, () => undefined);
    return { duplicate: false, credited: false, points: 0 };
  }

  // Atomic path: one RPC credits the user AND the referrer under a row lock.
  const { data: rpcData, error: rpcErr } = await admin.rpc("process_cpa_conversion", {
    p_lead_id: input.lead_id,
    p_user_id: input.subid,
    p_payout_cents: payoutCents,
    p_reward_points: rewardPoints,
    p_status: confirmed ? "confirmed" : "pending",
    p_campaign_id: input.campaign_id ?? null,
    p_campaign_name: input.campaign_name ?? null,
    p_country: input.country ?? null,
    p_event_type: input.event_type ?? null,
  });

  if (!rpcErr && rpcData) {
    const res = rpcData as { duplicate?: boolean; credited?: boolean; points?: number; referral_points?: number; commission_percent?: number };
    return {
      duplicate: Boolean(res.duplicate),
      credited: Boolean(res.credited),
      points: res.points ?? rewardPoints,
      referralPoints: res.referral_points ?? 0,
      commissionPercent: res.commission_percent ?? 0,
    };
  }

  // Fallback (RPC unavailable): sequential, best-effort writes.
  if (rpcErr && !/function .*process_cpa_conversion/i.test(rpcErr.message)) {
    throw new AppError(rpcErr.message, "CONVERSION_FAILED", 500);
  }
  const { error: insErr } = await admin.from("cpalead_conversions").insert({
    lead_id: input.lead_id, user_id: input.subid, campaign_id: input.campaign_id ?? null,
    campaign_name: input.campaign_name ?? null, payout_cents: payoutCents, reward_points: rewardPoints,
    status: confirmed ? "confirmed" : "pending", country: input.country ?? null,
    event_type: input.event_type ?? null, processed_at: new Date().toISOString(),
  });
  if (insErr) {
    if (insErr.code === "23505") return { duplicate: true, credited: false, points: 0 };
    throw new AppError(insErr.message, "CONVERSION_INSERT_FAILED", 500);
  }
  await applyLedger(admin, {
    userId: input.subid, type: "CPA_REWARD", status: confirmed ? "available" : "pending",
    points: rewardPoints, reference: input.lead_id,
    description: `CPAlead: ${input.campaign_name ?? input.campaign_id ?? "offer"}`,
  });
  let referralPoints = 0;
  let commissionPercent = 0;
  if (confirmed && user.referred_by && rewardPoints > 0) {
    const { data: referrer } = await admin.from("profiles").select("is_creator").eq("id", user.referred_by).maybeSingle();
    commissionPercent = referrer?.is_creator ? serverConfig.creatorCommissionPercentage : serverConfig.referralRewardPercentage;
    referralPoints = applyPercentage(rewardPoints, commissionPercent);
    if (referralPoints > 0) {
      await applyLedger(admin, {
        userId: user.referred_by, type: "REFERRAL_REWARD", status: "available",
        points: referralPoints, reference: `ref:${input.lead_id}`,
        description: `Referral commission (${commissionPercent}% of referred earnings)`,
      });
    }
  }
  return { duplicate: false, credited: confirmed, points: rewardPoints, referralPoints, commissionPercent };
}export async function getPublisherEarnings(admin: SupabaseClient): Promise<number> {
  const { data, error } = await admin.from("cpalead_conversions").select("payout_cents");
  if (error) throw new AppError(error.message, "CLA_REPORT_FAILED", 500);
  return (data ?? []).reduce((sum, r) => sum + (r.payout_cents as number), 0);
}