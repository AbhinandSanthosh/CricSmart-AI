export type HealthStatus = "ok" | "degraded" | "down" | "unconfigured";

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  latencyMs: number | null;
  detail?: string;
}

const TIMEOUT_MS = 5000;

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T | null; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const result = await fn();
    return { result, latencyMs: Date.now() - start };
  } catch (e) {
    return { result: null, latencyMs: Date.now() - start, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

async function checkCricApi(): Promise<ServiceHealth> {
  const key = process.env.CRICAPI_KEY;
  if (!key) {
    return { name: "CricAPI", status: "unconfigured", latencyMs: null, detail: "CRICAPI_KEY not set" };
  }
  const { result, latencyMs, error } = await timed(async () => {
    const res = await fetch(`https://api.cricapi.com/v1/cricScore?apikey=${key}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status && data.status !== "success") throw new Error(data.reason || "API error");
    return true;
  });
  if (!result) return { name: "CricAPI", status: "down", latencyMs, detail: error };
  if (latencyMs > 2000) return { name: "CricAPI", status: "degraded", latencyMs, detail: "High latency" };
  return { name: "CricAPI", status: "ok", latencyMs };
}

async function checkOpenRouter(): Promise<ServiceHealth> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return { name: "OpenRouter", status: "unconfigured", latencyMs: null, detail: "OPENROUTER_API_KEY not set" };
  }
  const { result, latencyMs, error } = await timed(async () => {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  });
  if (!result) return { name: "OpenRouter", status: "down", latencyMs, detail: error };
  if (latencyMs > 2000) return { name: "OpenRouter", status: "degraded", latencyMs, detail: "High latency" };
  return { name: "OpenRouter", status: "ok", latencyMs };
}

async function checkMlService(): Promise<ServiceHealth> {
  const url = process.env.NEXT_PUBLIC_ML_SERVICE_URL || "http://localhost:8000";
  const { result, latencyMs, error } = await timed(async () => {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  });
  if (!result) return { name: "ML Service (YOLO)", status: "down", latencyMs, detail: error };
  if (latencyMs > 2000) return { name: "ML Service (YOLO)", status: "degraded", latencyMs, detail: "High latency" };
  return { name: "ML Service (YOLO)", status: "ok", latencyMs };
}

export async function checkServices(): Promise<ServiceHealth[]> {
  const results = await Promise.allSettled([checkCricApi(), checkOpenRouter(), checkMlService()]);
  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const fallbackName = ["CricAPI", "OpenRouter", "ML Service (YOLO)"][i];
    return {
      name: fallbackName,
      status: "down" as HealthStatus,
      latencyMs: null,
      detail: r.reason instanceof Error ? r.reason.message : "Check failed",
    };
  });
}
