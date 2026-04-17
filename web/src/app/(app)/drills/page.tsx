"use client";

import { useState } from "react";
import { useAuth } from "@/store/auth";
import { Target, Footprints, Zap, Gamepad2, Clock, ChevronRight, Dumbbell, Shield, Eye, Check } from "lucide-react";

interface Drill {
  name: string;
  duration: string;
  description: string;
  steps: string[];
  videoUrl?: string;
}

interface DrillCategory {
  name: string;
  icon: React.ReactNode;
  drills: Drill[];
}

const BATTER_DRILLS: DrillCategory[] = [
  {
    name: "Basic Technique",
    icon: <Target className="w-4 h-4" />,
    drills: [
      { name: "Shadow Batting", duration: "15 min", description: "Practice your shots without a ball to build muscle memory.", steps: ["Set up in front of a mirror or camera", "Take your batting stance", "Play each shot 20 times: straight drive, cover drive, pull, cut", "Focus on footwork and follow-through"], videoUrl: "https://www.youtube.com/results?search_query=cricket+shadow+batting+drill" },
      { name: "Front Foot Defense", duration: "20 min", description: "The bread and butter of batting. Get your defense solid.", steps: ["Partner throws half-volleys from 10m", "Step forward with front foot to pitch of ball", "Keep bat close to pad, angled down", "Soft hands - let the ball die at your feet", "Do 5 sets of 12 balls"] },
      { name: "Back Foot Practice", duration: "20 min", description: "Handle short-pitched deliveries with confidence.", steps: ["Partner throws short balls from 12m", "Rock back and across on back foot", "Keep head still and eyes level", "Play defensive or cut shot", "Do 5 sets of 12 balls"] },
    ],
  },
  {
    name: "Hand-Eye Coordination",
    icon: <Zap className="w-4 h-4" />,
    drills: [
      { name: "Wall Rebound Drill", duration: "10 min", description: "Throw a ball against a wall and catch/hit the rebound.", steps: ["Stand 3m from a wall", "Throw tennis ball at wall", "Hit the rebound with your bat", "Alternate forehand and backhand", "Do 3 sets of 2 minutes"] },
      { name: "One-Hand Batting", duration: "15 min", description: "Improve bat control by batting with only your top hand.", steps: ["Grip bat with only top hand", "Partner throws gentle tosses", "Focus on timing, not power", "Switch to bottom hand for second set", "Do 3 sets per hand"] },
      { name: "Colored Ball Drill", duration: "10 min", description: "Different colored balls for different shots.", steps: ["Get 3 colors of tennis balls", "Red = drive, Blue = defend, Green = leave", "Partner throws random colors", "React to color and play correct shot", "Do 4 rounds of 15 balls"] },
    ],
  },
  {
    name: "Footwork & Movement",
    icon: <Footprints className="w-4 h-4" />,
    drills: [
      { name: "Ladder Drill", duration: "10 min", description: "Quick feet drills to improve agility between the creases.", steps: ["Lay out an agility ladder", "Run through with both feet in each rung", "Then: one foot per rung (sprint)", "Then: lateral shuffles", "3 sets of each pattern"] },
      { name: "Cone Movement Drill", duration: "15 min", description: "Set up cones to simulate running between wickets.", steps: ["Place cones 17.68m apart (pitch length)", "Sprint between cones 10 times", "Focus on turning technique", "Low center of gravity on turns", "Time yourself and try to improve"] },
    ],
  },
  {
    name: "Power & Shots",
    icon: <Zap className="w-4 h-4" />,
    drills: [
      { name: "Range Hitting", duration: "20 min", description: "Practice hitting for maximum distance.", steps: ["Use throwdowns or bowling machine", "Start at 70% power, build to 100%", "Focus on timing the ball at the top of the bounce", "Follow through completely", "Alternate between on-side and off-side lofts"] },
      { name: "Target Practice", duration: "15 min", description: "Hit targets placed in different areas of the field.", steps: ["Place cones at cover, mid-wicket, long-on, third man", "Partner bowls varied lengths", "Call the target zone before the ball is bowled", "Score points for hitting the zone", "Play 3 overs (18 balls)"] },
    ],
  },
  {
    name: "Game Simulation",
    icon: <Gamepad2 className="w-4 h-4" />,
    drills: [
      { name: "Scenario Practice", duration: "30 min", description: "Simulate real match situations.", steps: ["Scenario: 30 runs needed from 3 overs", "Play against a bowler with fielders", "Manage strike rotation and boundaries", "Practice under pressure with consequences", "Repeat with different scenarios"] },
    ],
  },
];

const BOWLER_DRILLS: DrillCategory[] = [
  {
    name: "Accuracy & Line-Length",
    icon: <Target className="w-4 h-4" />,
    drills: [
      { name: "Cone Target Bowling", duration: "20 min", description: "Bowl at specific targets on a good length.", steps: ["Place 4 cones on the pitch", "Bowl 6 balls at each target", "Score yourself: direct hit = 3pts, close = 1pt", "Aim for 30+ points out of 72", "Rest 30 seconds between sets"] },
      { name: "Yorker Practice", duration: "15 min", description: "Master the death-overs weapon.", steps: ["Place a shoe at batting crease line", "Bowl 30 yorkers aiming at the shoe", "Count how many hit within 1 foot", "Adjust your release point each time", "Target: 15+ on point"] },
      { name: "Corridor Bowling", duration: "15 min", description: "Bowl consistently in the 4th-5th stump corridor.", steps: ["Mark the corridor with tape/chalk", "Bowl 36 balls (6 overs)", "Count how many land in the corridor", "Aim for 24+ out of 36", "Vary pace while maintaining line"] },
    ],
  },
  {
    name: "Run-Up & Rhythm",
    icon: <Footprints className="w-4 h-4" />,
    drills: [
      { name: "Marker Run-Up", duration: "10 min", description: "Consistent run-up for consistent bowling.", steps: ["Mark your run-up with tape every stride", "Run through without bowling 5 times", "Check that you hit each marker", "Then bowl 12 balls focusing on rhythm", "Your front foot should land consistently"] },
      { name: "Shadow Bowling", duration: "10 min", description: "Bowl without a ball to focus on action mechanics.", steps: ["Run in and bowl air balls", "Focus on: high arm, hip rotation, follow-through", "Film yourself from side-on", "Compare with a professional bowler's action", "Do 3 sets of 6 deliveries"] },
    ],
  },
  {
    name: "Variations",
    icon: <Zap className="w-4 h-4" />,
    drills: [
      { name: "Slower Ball Masterclass", duration: "20 min", description: "Practice all types of slower deliveries.", steps: ["Bowl 6 off-cutters", "Bowl 6 leg-cutters", "Bowl 6 back-of-hand slower balls", "Bowl 6 split-finger slower balls", "Then: random mix of 12"] },
      { name: "Bouncer Mix", duration: "15 min", description: "Vary short balls with full deliveries.", steps: ["Bowl 3 balls: 2 good length + 1 bouncer", "The bouncer should be a surprise", "Vary the bouncer: body line, head height, wide", "Practice consistent action for all deliveries", "Do 6 sets"] },
    ],
  },
];

const KEEPER_DRILLS: DrillCategory[] = [
  {
    name: "Reflex & Reaction",
    icon: <Zap className="w-4 h-4" />,
    drills: [
      { name: "Tennis Ball Rapid Fire", duration: "10 min", description: "Sharp reflexes for edges and deflections.", steps: ["Stand behind stumps in full gear", "Partner throws tennis balls from 5m at varied heights", "Catch as many as possible in 2 minutes", "Move laterally for wider balls", "Do 3 sets with 1 min rest"], videoUrl: "https://www.youtube.com/results?search_query=wicketkeeper+reflex+drill" },
      { name: "Stumping Practice", duration: "15 min", description: "Quick glove work for spin bowling.", steps: ["Bowler bowls spin from 18m", "Batter plays and misses deliberately", "Take the ball and break stumps in one motion", "Practice collecting on both sides", "Do 20 stumpings per session"] },
    ],
  },
  {
    name: "Footwork & Positioning",
    icon: <Footprints className="w-4 h-4" />,
    drills: [
      { name: "Lateral Movement Drill", duration: "15 min", description: "Move quickly to take wide deliveries.", steps: ["Set up with cones 2m apart behind stumps", "Partner throws balls alternating left and right", "Dive and collect cleanly", "Return to center position each time", "Do 3 sets of 20 balls"] },
      { name: "Standing Up Drill", duration: "15 min", description: "Practice standing up to the stumps for medium pace.", steps: ["Stand up to stumps with medium-pace bowling", "Focus on watching the ball onto the gloves", "Practice taking clean on both sides", "Work on timing for stumpings", "Build up speed gradually"] },
    ],
  },
  {
    name: "Catching & Diving",
    icon: <Shield className="w-4 h-4" />,
    drills: [
      { name: "Edge Catching", duration: "15 min", description: "Simulate edge catches at match speed.", steps: ["Use bat and ball to create edge deflections", "Stand at normal keeping distance", "Focus on moving feet first, then hands", "Practice both regulation and diving catches", "Do 3 sets of 10 edges"] },
      { name: "High Ball Catching", duration: "10 min", description: "Take high catches from skied deliveries.", steps: ["Partner throws/hits high catches", "Call early and move into position", "Watch the ball into the gloves", "Practice catching with sun in eyes", "Do 2 sets of 15 catches"] },
    ],
  },
];

const FIELDING_DRILLS: DrillCategory[] = [
  {
    name: "Ground Fielding",
    icon: <Target className="w-4 h-4" />,
    drills: [
      { name: "Pick-Up & Throw", duration: "15 min", description: "Clean ground fielding and accurate throws.", steps: ["Partner rolls balls to your left and right", "Attack the ball, pick up cleanly", "Throw to single stump from 20m", "Aim for direct hits", "Do 3 sets of 15 balls per side"] },
      { name: "Sliding Stop", duration: "10 min", description: "Save boundaries with the sliding stop technique.", steps: ["Sprint to a rolling ball near the boundary", "Slide on your side to intercept", "Collect and throw in one motion", "Practice on both sides", "Do 3 sets of 10 sprints"] },
      { name: "Rapid Return Drill", duration: "10 min", description: "Fast pick-up and return under pressure.", steps: ["Stand 15m from stumps", "Ball is hit/rolled towards you", "Pick up and throw in under 2 seconds", "Alternate between underarm and overarm", "Track your accuracy over 20 balls"] },
    ],
  },
  {
    name: "Catching",
    icon: <Shield className="w-4 h-4" />,
    drills: [
      { name: "High Catch Practice", duration: "15 min", description: "Take high catches with confidence.", steps: ["Use a tennis racket or throwdowns for height", "Call loudly and get under the ball early", "Hands form a reverse cup above eye level", "Watch the ball into your hands", "Do 3 sets of 12 catches"] },
      { name: "Slip Catching", duration: "15 min", description: "Sharp reaction catches in the slip cordon.", steps: ["Stand in slip position", "Partner edges balls using bat", "Start with slow edges, build pace", "Focus on soft hands and watching the ball late", "Do 3 sets of 15 catches"], videoUrl: "https://www.youtube.com/results?search_query=cricket+slip+catching+drill" },
      { name: "One-Hand Catching", duration: "10 min", description: "Extend your range with one-handed grabs.", steps: ["Partner throws balls just out of two-hand reach", "Dive or stretch to catch with one hand", "Practice left and right", "Focus on cushioning the ball", "Do 2 sets of 10 per side"] },
    ],
  },
  {
    name: "Agility & Speed",
    icon: <Footprints className="w-4 h-4" />,
    drills: [
      { name: "Boundary Sprint Drill", duration: "10 min", description: "Sprint, collect, and relay from the boundary.", steps: ["Start on the boundary rope", "Sprint to collect a ball 20m infield", "Relay throw to keeper on the turn", "Jog back and repeat", "Do 3 sets of 8 sprints"] },
      { name: "Reaction Ball Drill", duration: "10 min", description: "Improve reflexes with unpredictable bounces.", steps: ["Use a reaction ball (uneven bounce)", "Throw against a wall", "React to the random bounce direction", "Catch cleanly if possible", "Do 3 sets of 2 minutes"] },
    ],
  },
  {
    name: "Throwing Accuracy",
    icon: <Eye className="w-4 h-4" />,
    drills: [
      { name: "Single Stump Target", duration: "15 min", description: "Hit a single stump from various distances.", steps: ["Start at 15m, throw at single stump", "Move back 5m after every 3 hits", "Track accuracy at each distance", "Use both flat throws and lobs", "Goal: 3 hits from 30m+"] },
      { name: "Run-Out Practice", duration: "15 min", description: "Simulate match run-out situations.", steps: ["Batter runs between wickets", "Field ball and throw to either end", "Focus on quick release", "Practice direct hits and backing up", "Do 3 sets of 10 attempts"] },
    ],
  },
];

const ALL_ROUNDER_DRILLS: DrillCategory[] = [
  {
    name: "Bowl-Bat Cycle",
    icon: <Dumbbell className="w-4 h-4" />,
    drills: [
      { name: "Transition Drill", duration: "40 min", description: "Bowl 6 then face 6 - simulate match conditions.", steps: ["Bowl a full over with match intensity", "Immediately pad up and face 6 balls", "Repeat 4 times (8 overs total)", "Focus on switching mindset between roles", "Track your bowling accuracy and batting strike rate"] },
      { name: "Pressure Switch", duration: "30 min", description: "Defend 10 runs then chase 10 runs.", steps: ["As bowler: defend 10 runs in 2 overs", "As batter: chase 10 runs in 2 overs", "Alternate roles with a partner", "Keep score - loser does 10 push-ups", "Best of 5 rounds"] },
    ],
  },
];

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

export default function DrillsPage() {
  const { user } = useAuth();
  const userRole = user?.primary_role || "Batter";
  const [activeRole, setActiveRole] = useState(userRole === "Wicketkeeper" ? "Wicketkeeper" : userRole === "All-Rounder" ? "All-Rounder" : userRole);
  const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"drills" | "plan">("drills");
  const [completing, setCompleting] = useState(false);
  const [completedMsg, setCompletedMsg] = useState("");

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

  const drillSets: Record<string, DrillCategory[]> = {
    Batter: BATTER_DRILLS,
    Bowler: BOWLER_DRILLS,
    Wicketkeeper: KEEPER_DRILLS,
    Fielding: FIELDING_DRILLS,
    "All-Rounder": ALL_ROUNDER_DRILLS,
  };
  const currentDrills = drillSets[activeRole] || BATTER_DRILLS;
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
        selectedDrill ? (
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
            {selectedDrill.videoUrl && (
              <a href={selectedDrill.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[var(--cs-accent)] text-[13px] mt-5 no-underline hover:underline">
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
                  <div key={drill.name} className="drill-item" onClick={() => { setSelectedDrill(drill); setSelectedCategory(cat.name); }}>
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
