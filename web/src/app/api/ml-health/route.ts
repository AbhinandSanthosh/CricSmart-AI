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

// Modal @modal.asgi_app() URLs follow the pattern:
//   https://<workspace>--<app-name>-<function-name>.modal.run
// where the function in modal_deploy.py is named `serve`. A common gotcha is
// pasting `https://<workspace>--<app-name>.modal.run` (no `-serve`), which
// returns 404 because there's no Modal function at that subdomain.
function suggestFixedModalUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith(".modal.run")) return null;
    if (u.hostname.endsWith("-serve.modal.run")) return null; // already correct
    // Insert `-serve` before `.modal.run`
    const host = u.hostname.replace(/\.modal\.run$/, "-serve.modal.run");
    return `${u.protocol}//${host}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

async function probe(url: string, signal: AbortSignal): Promise<{ status?: number; ok: boolean; body?: unknown; reason?: string; cause_code?: string }> {
  try {
    const res = await fetch(url, { signal });
    const text = await res.text();
    let body: unknown = null;
    try { body = JSON.parse(text); } catch { body = text.slice(0, 500); }
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } };
    return { ok: false, reason: err?.message || "unknown", cause_code: err?.cause?.code };
  }
}

export async function GET() {
  const { url, source } = resolveMlBase();
  const upstream = `${url}/health`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 25_000);

  const result = await probe(upstream, ac.signal);
  clearTimeout(timer);

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      upstream_url: upstream,
      env_source: source,
      upstream_status: result.status,
      upstream_response: result.body,
    });
  }

  // If the upstream looks like a Modal URL but the suspected suffix is wrong,
  // probe the fixed URL too so we can suggest a concrete remedy.
  const suggested = suggestFixedModalUrl(url);
  let suggestion: { url: string; works: boolean; status?: number } | null = null;
  if (suggested) {
    const ac2 = new AbortController();
    const timer2 = setTimeout(() => ac2.abort(), 25_000);
    const r2 = await probe(`${suggested}/health`, ac2.signal);
    clearTimeout(timer2);
    suggestion = { url: suggested, works: r2.ok, status: r2.status };
  }

  let hint = "Check that NEXT_PUBLIC_ML_SERVICE_URL points at your deployed Modal endpoint and includes the protocol (https://).";
  if (suggestion?.works) {
    hint = `Update NEXT_PUBLIC_ML_SERVICE_URL on Vercel to "${suggestion.url}" (note the -serve suffix - Modal asgi_app URLs include the function name) and redeploy.`;
  } else if (result.cause_code === "ENOTFOUND") {
    hint = "DNS lookup failed. The hostname in NEXT_PUBLIC_ML_SERVICE_URL doesn't exist - verify the Modal app deployed successfully and copy the URL it printed.";
  } else if (result.status === 404) {
    hint = "Upstream returned 404. The Modal app exists at this subdomain but has no /health route - the URL likely points at the wrong Modal function. Try the suggested fix.";
  } else if (result.reason && /timed?\s?out|abort/i.test(result.reason)) {
    hint = "Modal cold start can take 20-30s. Refresh once more - the container is loading.";
  }

  return NextResponse.json({
    ok: false,
    upstream_url: upstream,
    env_source: source,
    upstream_status: result.status,
    upstream_response: result.body,
    reason: result.reason,
    cause_code: result.cause_code,
    suggested_url: suggestion,
    hint,
  }, { status: 502 });
}
