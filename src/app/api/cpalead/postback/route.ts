import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processConversion } from "@/lib/services/cpalead";
import { serverConfig } from "@/lib/config";
import { errorResponse, Errors } from "@/lib/errors";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { timingSafeEqual } from "crypto";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
function readParams(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const get = (k: string) => sp.get(k) ?? sp.get(k.toUpperCase()) ?? null;
  return {
    subid: get("subid") ?? get("sid"),
    lead_id: get("lead_id") ?? get("leadid") ?? get("lead"),
    campaign_id: get("campaign_id") ?? get("cid"),
    campaign_name: get("campaign_name") ?? get("cname"),
    payout: get("payout") ?? get("amount"),
    password: get("password") ?? get("pass") ?? get("secret"),
    event_type: get("event") ?? get("event_type") ?? get("status"),
    country: get("country") ?? get("geo"),
  };
}
async function handle(req: NextRequest) {
  try {
    rateLimit("cpa:" + getClientIp(req.headers), 120, 60000);
    const p = readParams(req);
    if (!p.password || !safeEqual(p.password, serverConfig.cpaleadPostbackPassword)) {
      throw Errors.invalidPostback("Invalid postback password");
    }
    if (!p.subid) throw Errors.invalidPostback("Missing subid");
    if (!p.lead_id) throw Errors.invalidPostback("Missing lead_id");
    if (!p.payout) throw Errors.invalidPostback("Missing payout");
    const admin = createAdminClient();
    const result = await processConversion(admin, {
      subid: p.subid, lead_id: p.lead_id, campaign_id: p.campaign_id, campaign_name: p.campaign_name,
      payout: p.payout, event_type: p.event_type, country: p.country,
    });
    if (result.duplicate) return NextResponse.json({ ok: true, duplicate: true, credited: false });
    return NextResponse.json({ ok: true, credited: true, points: result.points });
  } catch (err) { return errorResponse(err); }
}
export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }