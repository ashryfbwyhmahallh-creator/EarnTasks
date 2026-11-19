"use client";




// Robust POST with a couple of retries for transient network/socket errors.
export async function postJson<T = unknown>(
  url: string,
  body: unknown,
  { retries = 3, timeoutMs = 15000 }: { retries?: number; timeoutMs?: number } = {}
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  let lastError = "Network error";
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = (await res.json().catch(() => null)) as T | null;
      if (res.ok) return { ok: true, status: res.status, data };
      // Retry only on server/transient errors, not client validation errors.
      if (res.status >= 500 || res.status === 503) {
        lastError = (data as { error?: string } | null)?.error ?? `Server error (${res.status})`;
      } else {
        return { ok: false, status: res.status, data, error: (data as { error?: string } | null)?.error };
      }
    } catch (e) {
      clearTimeout(timer);
      lastError = e instanceof Error ? e.message : "Network error";
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 400 * attempt));
  }
  return { ok: false, status: 0, data: null, error: lastError };
}
