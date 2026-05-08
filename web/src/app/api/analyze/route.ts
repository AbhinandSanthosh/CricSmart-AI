import { NextRequest, NextResponse } from "next/server";

// Vercel needs an explicit longer cap or the proxy is killed before Modal can
// cold-start the YOLO container (typically 20-30s on first request after idle).
export const runtime = "nodejs";
export const maxDuration = 60;

function resolveMlBase(): { url: string; source: string } {
  const raw =
    process.env.NEXT_PUBLIC_ML_SERVICE_URL ||
    process.env.ML_SERVICE_URL ||
    "";
  const url = raw.trim().replace(/\/+$/, ""); // strip trailing slash(es)
  if (!url) return { url: "http://localhost:8000", source: "default" };
  if (process.env.NEXT_PUBLIC_ML_SERVICE_URL) return { url, source: "NEXT_PUBLIC_ML_SERVICE_URL" };
  return { url, source: "ML_SERVICE_URL" };
}

export async function POST(req: NextRequest) {
  const { url: ML_BASE, source: envSource } = resolveMlBase();
  const upstreamUrl = `${ML_BASE}/analyze`;

  try {
    const formData = await req.formData();
    const outgoing = new FormData();
    for (const [key, value] of formData.entries()) {
      outgoing.append(key, value);
    }

    // 55s — leaves headroom under the 60s maxDuration above.
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 55_000);

    let res: Response;
    try {
      res = await fetch(upstreamUrl, {
        method: "POST",
        body: outgoing,
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        {
          error: "ML service returned an error",
          upstream_status: res.status,
          upstream_status_text: res.statusText,
          upstream_url: upstreamUrl,
          env_source: envSource,
          upstream_body: text.slice(0, 500),
        },
        { status: 502 },
      );
    }

    // Pass-through; surface a clean parse error if the upstream sent garbage.
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch {
      return NextResponse.json(
        {
          error: "ML service returned non-JSON",
          upstream_url: upstreamUrl,
          env_source: envSource,
          upstream_body: text.slice(0, 500),
        },
        { status: 502 },
      );
    }
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } };
    const isAbort = err?.name === "AbortError";
    const causeCode = err?.cause?.code;
    return NextResponse.json(
      {
        error: isAbort
          ? "ML service timed out (cold start can take 20-30s — try once more)"
          : "Couldn't reach ML service",
        upstream_url: upstreamUrl,
        env_source: envSource,
        reason: err?.message || "unknown",
        cause_code: causeCode,
      },
      { status: 502 },
    );
  }
}
