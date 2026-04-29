"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { auth } from "@/lib/firebase";
import { HealthBadge } from "@/components/admin/HealthBadge";
import type { ServiceHealth } from "@/lib/health";

export default function AdminHealthPage() {
  const [services, setServices] = useState<ServiceHealth[] | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch("/api/admin/health", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (cancelRef.current) return;
      setServices(data.services || []);
      setCheckedAt(data.checked_at || null);
    } catch {
      /* noop */
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    cancelRef.current = false;
    refresh();
    const id = window.setInterval(refresh, 30_000);
    return () => {
      cancelRef.current = true;
      window.clearInterval(id);
    };
  }, [refresh]);

  return (
    <div>
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">API Health Monitor</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {checkedAt ? `Last checked ${new Date(checkedAt).toLocaleTimeString()}` : "Checking..."} · auto-refresh every 30s
          </p>
        </div>
        <button onClick={refresh} disabled={busy} className="btn btn-secondary text-sm disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh now
        </button>
      </div>

      {services === null ? (
        <div className="text-center py-10 text-[var(--text-muted)] text-sm">Pinging services...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {services.map((s) => (
            <div key={s.name} className="panel p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-bold text-[var(--text-main)]">{s.name}</h3>
                <HealthBadge status={s.status} />
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                {s.latencyMs !== null ? (
                  <span>
                    Latency: <span className="font-bold text-[var(--text-main)]">{s.latencyMs}ms</span>
                  </span>
                ) : (
                  <span>—</span>
                )}
              </div>
              {s.detail && <div className="text-xs text-[var(--text-muted)] mt-2 break-words">{s.detail}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
