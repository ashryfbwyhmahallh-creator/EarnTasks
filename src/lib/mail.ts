import "server-only";
import { createTransport, type Transporter } from "nodemailer";

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createFreshTransporter(): Transporter | null {
  if (!isMailConfigured()) return null;
  const port = Number(process.env.SMTP_PORT ?? "465");
  return createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    pool: false,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export interface MailInput { subject: string; text: string; html?: string; to?: string; }

export function buildPayoutEmail(to: string, subject: string, fields: Record<string, string>): MailInput {
  const cell = "padding:6px 12px;border:1px solid #ddd";
  const rows = Object.entries(fields)
    .map(([k, v]) => '<tr><td style="' + cell + ';font-weight:600">' + k + '</td><td style="' + cell + '">' + v + '</td></tr>')
    .join("");
  const text = Object.entries(fields).map(([k, v]) => k + ": " + v).join("\n");
  const html = '<h2>' + subject + '</h2><table style="border-collapse:collapse">' + rows + '</table>';
  return { to, subject, text, html };
}
export async function sendMail(input: MailInput): Promise<{ sent: boolean; error?: string }> {
  const to = input.to ?? process.env.NOTIFICATION_EMAIL ?? process.env.SMTP_USER;
  if (!to) return { sent: false, error: "Mail is not configured" };
  let lastError = "send failed";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const tx = createFreshTransporter();
    if (!tx) return { sent: false, error: "Mail is not configured" };
    try {
      await tx.sendMail({
        from: process.env.SMTP_USER,
        to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      return { sent: true };
    } catch (e) {
      lastError = e instanceof Error ? e.message : "send failed";
      console.error("[mail] send attempt " + attempt + " failed:", lastError);
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  return { sent: false, error: lastError };
}