import { NextResponse } from "next/server";

// Diagnostic endpoint. Visit /api/ml-health to verify the Vercel proxy can
// reach the ML service. Reports the resolved upstream URL, the env var that
// supplied it, and the upstream response.

export const runtime = "nodejs";
export const maxDuration = 30;

function resolveMlBase(): { url: string; source: string } {
  const raw =
    process.env.NEXT_PUBLIC_ML_SERVICE_URL ||
    process.env.ML_SERVICE_URL ||
    "";
  const url = raw.trim().replace(/\/+$/, "");
  if (!url) return { url: "http://localhost:8000", source: "default" };
  if (process.env.NEXT_PUBLIC_ML_SERVICE_URL) return { url, source: "NEXT_PUBLIC_ML_SERVICE_URL" };
  return { url, source: "ML_SERVICE_URL" };
}

export async function GET() {
  const { url, source } = resolveMlBase();
  const upstream = `${url}/health`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 25_000);

  try {
    const res = await fetch(upstream, { signal: ac.signal });
    const text = await res.text();
    let data: unknown = null;
    try { data = JSON.parse(text); } catch { /* keep as text */ }
    return NextResponse.json({
      ok: res.ok,
      upstream_url: upstream,
      env_source: source,
      upstream_status: res.status,
      upstream_response: data ?? text.slice(0, 500),
    }, { status: res.ok ? 200 : 502 });
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } };
    return NextResponse.json({
      ok: false,
      upstream_url: upstream,
      env_source: source,
      reason: err?.message || "unknown",
      cause_code: err?.cause?.code,
      hint: err?.name === "AbortError"
        ? "Modal cold start can take 20-30s. Refresh once more."
        : "Check that NEXT_PUBLIC_ML_SERVICE_URL points at your deployed Modal endpoint and includes the protocol (https://).",
    }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
