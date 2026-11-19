import { NextResponse, type NextRequest } from "next/server";
import { resolveUser } from "@/lib/auth";
import { DEMO_USER_ID } from "@/lib/demo";
import { detectVpn, clientIp } from "@/lib/services/vpn";
import { errorResponse, Errors } from "@/lib/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OFFERWALL_BASE = "https://www.cdnnd.com/wall/tgHQAI9w";

export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser();
    if (!user) throw Errors.unauthorized();

    // VPN / Proxy / Tor blocking for the offerwall.
    const vpn = await detectVpn(clientIp(req.headers));
    if (vpn.blocked) {
      return NextResponse.json(
        {
          subid: null,
          offerwall_url: null,
          available: false,
          demo: user.isDemo,
          reason: vpn.reason,
          message: "Offerwall unavailable: VPN/proxy/Tor traffic detected. Disable it and refresh.",
        },
        { status: 403 });
    }

    const subid = user.isDemo ? DEMO_USER_ID : user.id;
    const offerwallUrl = OFFERWALL_BASE + "?subid=" + encodeURIComponent(subid);
    return NextResponse.json({
      subid,
      offerwall_url: offerwallUrl,
      available: true,
      demo: user.isDemo,
      vpn_checked: vpn.checked,
      message: null,
    });
  } catch (err) { return errorResponse(err); }
}