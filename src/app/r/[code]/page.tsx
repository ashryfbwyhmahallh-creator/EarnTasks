import { redirect } from "next/navigation";
import { normalizeReferralCode } from "@/lib/referral";

// Short referral link: /r/CODE -> /register?ref=CODE
export default function ReferralRedirectPage({ params }: { params: { code: string } }) {
  const code = normalizeReferralCode(params.code);
  if (!code) redirect("/register");
  redirect("/register?ref=" + code);
}
