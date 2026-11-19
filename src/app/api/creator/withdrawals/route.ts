import { NextResponse, type NextRequest } from "next/server";
import { resolveUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDemoState, demoAddLedger } from "@/lib/demo";
import { createWithdrawal } from "@/lib/services/withdrawals";
import { getWithdrawalMethod, getWithdrawalMethods } from "@/lib/withdrawalMethods";
import { pointsToCents, formatCents } from "@/lib/money";
import { sendMail, isMailConfigured, buildPayoutEmail } from "@/lib/mail";
import { withdrawalSchema } from "@/lib/validation";
import { errorResponse, Errors } from "@/lib/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await resolveUser();
    if (!user) throw Errors.unauthorized();
    if (!user.isCreator) throw Errors.forbidden("Creator access required");
    if (user.isDemo) {
      const s = getDemoState();
      return NextResponse.json({ withdrawals: s.withdrawals.filter((w) => (w as { kind?: string }).kind === "creator"), methods: getWithdrawalMethods("creator") });
    }
    const admin = createAdminClient();
    const { data, error } = await admin.from("withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) throw Errors.badRequest(error.message);
    return NextResponse.json({ withdrawals: data ?? [], methods: getWithdrawalMethods("creator") });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser();
    if (!user) throw Errors.unauthorized();
    if (!user.isCreator) throw Errors.forbidden("Creator access required");
    const body = await req.json().catch(() => null);
    const parsed = withdrawalSchema.safeParse(body);
    if (!parsed.success) throw Errors.badRequest("Invalid withdrawal request", parsed.error.flatten());
    // Creators / affiliates: PayPal or USDT (with network).
    const method = getWithdrawalMethod(parsed.data.method, "creator");
    if (!method) throw Errors.badRequest("Unknown or disabled creator withdrawal method");
    const amountCents = pointsToCents(parsed.data.amount_points);
    const timestamp = new Date().toISOString();
    let withdrawalId = "";
    let profileEmail = user.email;
    let profileUsername = "";
    if (user.isDemo) {
      const s = getDemoState();
      profileEmail = s.profile.email;
      profileUsername = s.profile.username;
      if (parsed.data.amount_points < method.minimum_points) {
        throw Errors.badRequest("Minimum withdrawal for " + method.name + " is " + method.minimum_points + " points ($" + method.minimum_usd + ")");
      }
      if (s.wallet.available_points < parsed.data.amount_points) {
        throw Errors.badRequest("Insufficient available balance");
      }
      withdrawalId = "demo-cwd-" + s.withdrawals.length + "-" + Date.now();
      const wd = {
        id: withdrawalId, user_id: user.id, method: method.id,
        amount_points: parsed.data.amount_points, amount_cents: amountCents,
        destination: parsed.data.destination, status: "pending", admin_note: null,
        created_at: timestamp, processed_at: null, kind: "creator",
      };
      s.withdrawals.unshift(wd);
      demoAddLedger({ type: "WITHDRAWAL", status: "available", points: -parsed.data.amount_points, reference: withdrawalId, description: "Creator payout: " + method.name });
    } else {
      const admin = createAdminClient();
      const { data: prof } = await admin.from("profiles").select("email, username").eq("id", user.id).maybeSingle();
      if (prof) { profileEmail = prof.email as string; profileUsername = (prof.username as string) ?? ""; }
      const wd = await createWithdrawal(admin, {
        userId: user.id, method: parsed.data.method, amountPoints: parsed.data.amount_points, destination: parsed.data.destination, audience: "creator",
      });
      withdrawalId = (wd as { id: string }).id;
    }
    const accountDetails = Object.entries(parsed.data.destination).map(([k, v]) => k + ": " + v).join(" | ");
    const fields: Record<string, string> = {
      "Request Type": "Creator / Affiliate payout",
      Username: profileUsername || "(none)",
      Email: profileEmail || "(none)",
      "Payment Method": method.name,
      "Account Details": accountDetails,
      Amount: parsed.data.amount_points + " points (" + formatCents(amountCents) + ")",
      Timestamp: timestamp,
    };
    const notificationEmail = process.env.NOTIFICATION_EMAIL ?? process.env.SMTP_USER ?? "";
    let emailSent = false;
    let emailError: string | null = null;
    if (notificationEmail && isMailConfigured()) {
      const result = await sendMail(buildPayoutEmail(notificationEmail, "New Creator Payout Request - EarnTasks", fields));
      emailSent = result.sent;
      emailError = result.error ?? null;
    }
    return NextResponse.json({ withdrawal_id: withdrawalId, email_sent: emailSent, email_error: emailError }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
