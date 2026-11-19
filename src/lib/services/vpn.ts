import { serverConfig } from "@/lib/config";


export interface VpnCheckResult {
  blocked: boolean;
  reason: string | null;
  checked: boolean;
}

// Detects VPN / proxy / Tor / relay / datacenter traffic for offerwall access.
// Uses vpnapi.io when a key is configured; otherwise returns "checked: false"
// so the caller can decide to allow (fail-open) the request.
export async function detectVpn(ip: string | null): Promise<VpnCheckResult> {
  const key = serverConfig.vpnApiKey;
  if (!key || !ip) return { blocked: false, reason: null, checked: false };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://vpnapi.io/api/${encodeURIComponent(ip)}?key=${encodeURIComponent(key)}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return { blocked: false, reason: null, checked: false };
    const data = await res.json();
    const sec = (data?.security ?? {}) as Record<string, unknown>;
    const reasons: string[] = [];
    if (sec.vpn === true) reasons.push("vpn");
    if (sec.proxy === true) reasons.push("proxy");
    if (sec.tor === true) reasons.push("tor");
    if (sec.relay === true) reasons.push("relay");
    return { blocked: reasons.length > 0, reason: reasons[0] ?? null, checked: true };
  } catch {
    // Network failure: fail-open so legitimate users are never locked out.
    return { blocked: false, reason: null, checked: false };
  }
}

export function clientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  return headers.get("x-real-ip") ?? headers.get("cf-connecting-ip") ?? null;
}
