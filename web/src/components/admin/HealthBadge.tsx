import type { HealthStatus } from "@/lib/health";

const COLORS: Record<HealthStatus, string> = {
  ok: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  degraded: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  down: "bg-red-500/15 text-red-300 border-red-500/40",
  unconfigured: "bg-zinc-500/15 text-zinc-300 border-zinc-500/40",
};

const LABEL: Record<HealthStatus, string> = {
  ok: "ACTIVE",
  degraded: "DEGRADED",
  down: "DOWN",
  unconfigured: "NOT CONFIGURED",
};

export function HealthBadge({ status }: { status: HealthStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md border text-[10px] font-bold tracking-widest ${COLORS[status]}`}>
      {LABEL[status]}
    </span>
  );
}
