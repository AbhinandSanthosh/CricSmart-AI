"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/store/auth";
import { Target, Footprints, Zap, Gamepad2, Clock, ChevronRight, Dumbbell, Shield, Eye, Check } from "lucide-react";

interface Drill {
  id: number;
  role: string;
  category: string;
  category_icon: string;
  name: string;
  duration: string;
  description: string;
  steps: string[];
  video_url: string;
}

interface DrillCategory {
  name: string;
  icon: React.ReactNode;
  drills: Drill[];
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  Footprints,
  Zap,
  Gamepad2,
  Shield,
  Eye,
  Dumbbell,
};

function iconFor(name: string): React.ReactNode {
  const Icon = ICON_MAP[name] || Target;
  return <Icon className="w-4 h-4" />;
}

const ROLE_TABS = [
  { key: "Batter", label: "BATTER", icon: "🏏" },
  { key: "Bowler", label: "BOWLER", icon: "🎯" },
  { key: "Wicketkeeper", label: "KEEPER", icon: "🧤" },
  { key: "Fielding", label: "FIELDING", icon: "🏃" },
  { key: "All-Rounder", label: "ALL-ROUNDER", icon: "⚡" },
];

function getWeeklyPlan(role: string): string[] {
  if (role === "Batter") return ["Mon: Shadow batting (15min) + Front foot defense (20min)", "Tue: Hand-eye coordination drills (25min) + Fitness", "Wed: Footwork ladder drill (10min) + Net session", "Thu: REST - Light stretching & visualization", "Fri: Power hitting (20min) + Target practice (15min)", "Sat: Game simulation scenario (30min) + Net session", "Sun: Video analysis of the week + Light batting"];
  if (role === "Bowler") return ["Mon: Cone target bowling (20min) + Run-up work", "Tue: Corridor bowling (15min) + Fitness & conditioning", "Wed: Variation practice - slower balls (20min)", "Thu: REST - Light stretching & recovery", "Fri: Yorker practice (15min) + Bouncer mix (15min)", "Sat: Match simulation bowling (6 overs) + Analysis", "Sun: Shadow bowling + Flexibility work"];
  if (role === "All-Rounder") return ["Mon: Bowl 6 overs (accuracy) + Bat 30min (technique)", "Tue: Bowling variations (20min) + Fitness", "Wed: Transition drill - bowl 6, bat 6 (40min)", "Thu: REST - Light stretching & mental preparation", "Fri: Power hitting (20min) + Yorker practice (15min)", "Sat: Full match simulation + Pressure switch drill", "Sun: Video analysis + Recovery session"];
  if (role === "Fielding") return ["Mon: Ground fielding pick-up & throw (15min) + Catching", "Tue: Slip catching (15min) + Agility drills", "Wed: Boundary sprint drill (10min) + Throwing accuracy", "Thu: REST - Flexibility & hand-eye exercises", "Fri: One-hand catching (10min) + Run-out practice", "Sat: Full fielding session - all positions (45min)", "Sun: Reaction ball drill + Light stretching"];
  return ["Mon: Reflex tennis ball drill (10min) + Agility work", "Tue: Stumping practice to spin (15min) + Footwork", "Wed: Batting net session (30min) + Keeping to pace", "Thu: REST - Flexibility, hand strength exercises", "Fri: Rapid fire catching (15min) + Standing back practice", "Sat: Match simulation - keeping full innings + Batting", "Sun: Video review + Light fitness"];
}

function groupByCategory(drills: Drill[]): DrillCategory[] {
  const map = new Map<string, DrillCategory>();
  for (const d of drills) {
    if (!map.has(d.category)) {
      map.set(d.category, { name: d.category, icon: iconFor(d.category_icon), drills: [] });
    }
    map.get(d.category)!.drills.push(d);
  }
  return Array.from(map.values());
}

export default function DrillsPage() {
  const { user } = useAuth();
  const userRole = user?.primary_role || "Batter";
  const [activeRole, setActiveRole] = useState(userRole === "Wicketkeeper" ? "Wicketkeeper" : userRole === "All-Rounder" ? "All-Rounder" : userRole);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"drills" | "plan">("drills");
  const [completing, setCompleting] = useState(false);
  const [completedMsg, setCompletedMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelectedDrill(null);
    (async () => {
      try {
        const { auth } = await import("@/lib/firebase");
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          if (!cancelled) setLoading(false);
          return;
        }
        const res = await fetch(`/api/drills?role=${encodeURIComponent(activeRole)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (!cancelled) {
            setDrills([]);
            setLoading(false);
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setDrills(data.drills || []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setDrills([]);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeRole]);

  async function markDrillComplete(drill: Drill, category: string) {
    if (completing) return;
    setCompleting(true);
    setCompletedMsg("");
    try {
      const { auth } = await import("@/lib/firebase");
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setCompletedMsg("Please sign in to track progress");
        return;
      }
      const res = await fetch("/api/drills/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ drillName: drill.name, category }),
      });
      if (res.ok) {
        setCompletedMsg(`✓ ${drill.name} marked complete!`);
      } else {
        setCompletedMsg("Failed to save drill completion");
      }
    } catch {
      setCompletedMsg("Network error");
    } finally {
      setCompleting(false);
    }
  }

  const currentDrills = groupByCategory(drills);
  const weeklyPlan = getWeeklyPlan(activeRole);

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Hero */}
      <div className="col-span-12 py-5">
        <p className="label-bracket mb-3">Training Academy</p>
        <h1 className="text-4xl font-bold text-[var(--text-main)] tracking-tight">Academy Drills</h1>
        <p className="text-[var(--text-muted)] text-base mt-2">
          Role-specific practice routines to elevate your game
        </p>
      </div>

      {/* Role Tabs */}
      <div className="col-span-12 flex gap-2 flex-wrap">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveRole(tab.key); setSelectedDrill(null); }}
            className={`py-2.5 px-5 rounded-lg text-sm font-semibold cursor-pointer border transition-all flex items-center gap-2 ${
              activeRole === tab.key
                ? "bg-[var(--cs-accent-light)] text-[var(--cs-accent)] border-[var(--cs-accent)]"
                : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--cs-border)]"
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Drill/Plan Tabs */}
      <div className="col-span-12 flex gap-3">
        <button onClick={() => setActiveTab("drills")} className={`btn ${activeTab === "drills" ? "btn-primary" : "btn-secondary"} py-2 px-6 text-sm`}>
          Drill Library
        </button>
        <button onClick={() => setActiveTab("plan")} className={`btn ${activeTab === "plan" ? "btn-primary" : "btn-secondary"} py-2 px-6 text-sm`}>
          Weekly Plan
        </button>
      </div>

      {activeTab === "drills" && (
        loading ? (
          <div className="col-span-12 text-center py-10 text-[var(--text-muted)] text-sm">Loading drills...</div>
        ) : selectedDrill ? (
          <div className="panel col-span-12">
            <div className="panel-header">
              <span className="label-bracket">drill_detail</span>
              <button className="btn btn-secondary py-1.5 px-4 text-xs" onClick={() => setSelectedDrill(null)}>Back</button>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-main)] mb-4">{selectedDrill.name}</h2>
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-4">
              <Clock className="w-4 h-4" />
              <span className="text-[13px]">{selectedDrill.duration}</span>
            </div>
            <p className="text-[var(--text-muted)] text-sm mb-6">{selectedDrill.description}</p>
            <div className="label-bracket mb-3">steps</div>
            <div className="flex flex-col gap-2.5">
              {selectedDrill.steps.map((step, i) => (
                <div key={i} className="flex gap-4 items-start p-3 rounded-xl bg-[var(--bg-surface)]">
                  <span className="w-7 h-7 rounded-full bg-[var(--cs-accent-light)] text-[var(--cs-accent)] text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-[var(--text-main)]">{step}</span>
                </div>
              ))}
            </div>
            {selectedDrill.video_url && (
              <a href={selectedDrill.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[var(--cs-accent)] text-[13px] mt-5 no-underline hover:underline">
                Watch tutorial videos <ChevronRight className="w-3.5 h-3.5" />
              </a>
            )}
            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <button
                onClick={() => markDrillComplete(selectedDrill, selectedCategory)}
                disabled={completing}
                className="btn btn-primary disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {completing ? "Saving..." : "Mark as Completed"}
              </button>
              {completedMsg && (
                <span className="text-sm text-[var(--cs-accent)] font-medium">{completedMsg}</span>
              )}
            </div>
          </div>
        ) : currentDrills.length === 0 ? (
          <div className="panel col-span-12">
            <p className="text-sm text-[var(--text-muted)] py-6 text-center">No drills available for this role yet.</p>
          </div>
        ) : (
          currentDrills.map((cat) => (
            <div className="panel col-span-12" key={cat.name}>
              <div className="panel-header">
                <span className="label-bracket flex items-center gap-2">
                  {cat.icon} {cat.name}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {cat.drills.map((drill) => (
                  <div key={drill.id} className="drill-item" onClick={() => { setSelectedDrill(drill); setSelectedCategory(cat.name); }}>
                    <div className="drill-info">
                      <h4>{drill.name}</h4>
                      <p>{drill.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="drill-status">{drill.duration}</span>
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )
      )}

      {activeTab === "plan" && (
        <div className="panel col-span-12">
          <div className="panel-header">
            <span className="label-bracket">weekly_schedule</span>
            <h2 className="panel-title text-lg font-bold text-[var(--text-main)]">7-Day {activeRole} Plan</h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {weeklyPlan.map((day, i) => {
              const [dayName, ...rest] = day.split(": ");
              const isRest = rest.join(": ").toLowerCase().includes("rest");
              return (
                <div key={i} className={`p-4 rounded-xl border ${isRest ? "bg-[var(--cs-accent-light)] border-[var(--cs-accent)]" : "bg-[var(--bg-surface)] border-[var(--cs-border)]"}`}>
                  <span className={`font-bold text-sm mr-3 ${isRest ? "text-[var(--cs-accent)]" : "text-[var(--text-main)]"}`}>{dayName}</span>
                  <span className="text-[13px] text-[var(--text-muted)]">{rest.join(": ")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
