"use client";

import { useState } from "react";
import { compareWithPro, PRO_PLAYERS } from "@/lib/pro-reference";
import type { AnalysisResult } from "@/lib/pose-analysis";
import { Target, Lightbulb } from "lucide-react";

interface Props {
  result: AnalysisResult;
}

export function ProComparison({ result }: Props) {
  const [selectedPro, setSelectedPro] = useState("sachin");
  const comparison = compareWithPro(result, selectedPro);

  const statusColor = (status: string) => {
    if (status === "close") return "#22c55e";
    if (status === "moderate") return "#f59e0b";
    return "var(--cs-danger)";
  };

  const statusBg = (status: string) => {
    if (status === "close") return "rgba(34,197,94,0.1)";
    if (status === "moderate") return "rgba(245,158,11,0.1)";
    return "rgba(239,68,68,0.1)";
  };

  const statusBorder = (status: string) => {
    if (status === "close") return "rgba(34,197,94,0.3)";
    if (status === "moderate") return "rgba(245,158,11,0.3)";
    return "rgba(239,68,68,0.3)";
  };

  return (
    <div className="panel col-span-12">
      <div className="panel-header">
        <span className="label-bracket flex items-center gap-2">
          <Target className="w-3.5 h-3.5" /> Pro Comparison
        </span>
        <h2 className="panel-title">Compare with Legends</h2>
      </div>

      {/* Pro selector tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {PRO_PLAYERS.map((pro) => (
          <button
            key={pro.key}
            onClick={() => setSelectedPro(pro.key)}
            className={`py-2.5 px-4 rounded-lg text-sm font-semibold cursor-pointer border transition-all ${
              selectedPro === pro.key
                ? "bg-[var(--cs-accent-light)] text-[var(--cs-accent)] border-[var(--cs-accent)]"
                : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--cs-border)] hover:border-[var(--cs-border-strong)]"
            }`}
          >
            {pro.name}
          </button>
        ))}
      </div>

      {/* Pro info */}
      <div className="mb-5 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--cs-border)]">
        <div className="flex items-center justify-between mb-1">
          <div>
            <span className="text-base font-bold text-[var(--text-main)]">{comparison.pro.name}</span>
            <span className="text-sm text-[var(--text-muted)] ml-2">— {comparison.pro.style}</span>
          </div>
          <div className="stat-val text-2xl" style={{ color: comparison.matchPercentage >= 70 ? "#22c55e" : comparison.matchPercentage >= 40 ? "#f59e0b" : "var(--cs-danger)" }}>
            {comparison.matchPercentage}%
            <span className="text-xs text-[var(--text-muted)] font-normal not-italic ml-1">match</span>
          </div>
        </div>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">{comparison.pro.description}</p>
      </div>

      {/* Comparison grid */}
      <div className="flex flex-col gap-2.5">
        {/* Header */}
        <div className="grid grid-cols-4 gap-3 px-4 py-2">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Metric</span>
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider text-center">You</span>
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider text-center">{comparison.pro.name.split(" ")[0]}</span>
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider text-right">Status</span>
        </div>

        {comparison.rows.map((row) => (
          <div
            key={row.metric}
            className="grid grid-cols-4 gap-3 items-center px-4 py-3 rounded-xl border"
            style={{ background: statusBg(row.status), borderColor: statusBorder(row.status) }}
          >
            <span className="text-sm font-semibold text-[var(--text-main)]">{row.metric}</span>
            <span className="text-sm text-center text-[var(--text-main)]">{row.userValue}</span>
            <span className="text-sm text-center text-[var(--text-muted)]">{row.proValue}</span>
            <span
              className="text-xs font-semibold text-right"
              style={{ color: statusColor(row.status) }}
            >
              {row.difference}
            </span>
          </div>
        ))}
      </div>

      {/* Tips */}
      {comparison.tips.length > 0 && (
        <div className="mt-5 p-4 rounded-xl bg-[var(--cs-accent-light)] border border-[var(--cs-accent)]">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-[var(--cs-accent)]" />
            <span className="text-sm font-bold text-[var(--cs-accent)]">Tips to Match {comparison.pro.name}</span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {comparison.tips.map((tip, i) => (
              <li key={i} className="text-sm text-[var(--text-main)] leading-relaxed">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
