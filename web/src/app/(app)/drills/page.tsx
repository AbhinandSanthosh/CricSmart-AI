"use client";

import { useState } from "react";
import { useAuth } from "@/store/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, Target, Footprints, Zap, Gamepad2, Clock, ChevronRight } from "lucide-react";

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
      { name: "Cone Target Bowling", duration: "20 min", description: "Bowl at specific targets on a good length.", steps: ["Place 4 cones on the pitch: good length off, good length leg, yorker, bouncer", "Bowl 6 balls at each target", "Score yourself: direct hit = 3pts, close = 1pt", "Aim for 30+ points out of 72", "Rest 30 seconds between sets"] },
      { name: "Yorker Practice", duration: "15 min", description: "Master the death-overs weapon.", steps: ["Place a shoe at batting crease line", "Bowl 30 yorkers aiming at the shoe", "Count how many hit within 1 foot", "Adjust your release point each time", "Target: 15+ on point"] },
      { name: "Corridor Bowling", duration: "15 min", description: "Bowl consistently in the 4th-5th stump corridor.", steps: ["Mark the corridor with tape/chalk: off stump to 6 inches outside", "Bowl 36 balls (6 overs)", "Count how many land in the corridor", "Aim for 24+ out of 36", "Vary pace while maintaining line"] },
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
      { name: "Slower Ball Masterclass", duration: "20 min", description: "Practice all types of slower deliveries.", steps: ["Bowl 6 off-cutters", "Bowl 6 leg-cutters", "Bowl 6 back-of-hand slower balls", "Bowl 6 split-finger slower balls", "Then: random mix of 12 without telling the batter"] },
      { name: "Bouncer Mix", duration: "15 min", description: "Vary short balls with full deliveries.", steps: ["Bowl 3 balls: 2 good length + 1 bouncer", "The bouncer should be a surprise", "Vary the bouncer: body line, head height, wide", "Practice the setup: consistent action for all deliveries", "Do 6 sets"] },
    ],
  },
];

const ALL_ROUNDER_DRILLS: DrillCategory[] = [
  {
    name: "Bowl-Bat Cycle",
    icon: <Dumbbell className="w-4 h-4" />,
    drills: [
      { name: "Transition Drill", duration: "40 min", description: "Bowl 6 then face 6 - simulate match conditions.", steps: ["Bowl a full over (6 balls) with match intensity", "Immediately pad up and face 6 balls", "Repeat 4 times (8 overs total)", "Focus on switching mindset between roles", "Track your bowling accuracy and batting strike rate"] },
      { name: "Pressure Switch", duration: "30 min", description: "Defend 10 runs then chase 10 runs.", steps: ["As bowler: defend 10 runs in 2 overs", "As batter: chase 10 runs in 2 overs", "Alternate roles with a partner", "Keep score - loser does 10 push-ups", "Best of 5 rounds"] },
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
];

function getWeeklyPlan(role: string): string[] {
  if (role === "Batter") {
    return [
      "Mon: Shadow batting (15min) + Front foot defense (20min)",
      "Tue: Hand-eye coordination drills (25min) + Fitness",
      "Wed: Footwork ladder drill (10min) + Net session",
      "Thu: REST - Light stretching & visualization",
      "Fri: Power hitting (20min) + Target practice (15min)",
      "Sat: Game simulation scenario (30min) + Net session",
      "Sun: Video analysis of the week + Light batting",
    ];
  }
  if (role === "Bowler") {
    return [
      "Mon: Cone target bowling (20min) + Run-up work",
      "Tue: Corridor bowling (15min) + Fitness & conditioning",
      "Wed: Variation practice - slower balls (20min)",
      "Thu: REST - Light stretching & recovery",
      "Fri: Yorker practice (15min) + Bouncer mix (15min)",
      "Sat: Match simulation bowling (6 overs) + Analysis",
      "Sun: Shadow bowling + Flexibility work",
    ];
  }
  if (role === "All-Rounder") {
    return [
      "Mon: Bowl 6 overs (accuracy) + Bat 30min (technique)",
      "Tue: Bowling variations (20min) + Fitness",
      "Wed: Transition drill - bowl 6, bat 6 (40min)",
      "Thu: REST - Light stretching & mental preparation",
      "Fri: Power hitting (20min) + Yorker practice (15min)",
      "Sat: Full match simulation + Pressure switch drill",
      "Sun: Video analysis + Recovery session",
    ];
  }
  // Wicketkeeper
  return [
    "Mon: Reflex tennis ball drill (10min) + Agility work",
    "Tue: Stumping practice to spin (15min) + Footwork",
    "Wed: Batting net session (30min) + Keeping to pace",
    "Thu: REST - Flexibility, hand strength exercises",
    "Fri: Rapid fire catching (15min) + Standing back practice",
    "Sat: Match simulation - keeping full innings + Batting",
    "Sun: Video review + Light fitness",
  ];
}

export default function DrillsPage() {
  const { user } = useAuth();
  const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null);
  const role = user?.primary_role || "Batter";

  const drillSets: Record<string, DrillCategory[]> = {
    Batter: BATTER_DRILLS,
    Bowler: BOWLER_DRILLS,
    "All-Rounder": ALL_ROUNDER_DRILLS,
    Wicketkeeper: KEEPER_DRILLS,
  };

  const currentDrills = drillSets[role] || BATTER_DRILLS;
  const weeklyPlan = getWeeklyPlan(role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Training Drills</h1>
        <p className="text-muted-foreground mt-1">
          Structured practice routines for {role}s
        </p>
      </div>

      <Tabs defaultValue="drills">
        <TabsList>
          <TabsTrigger value="drills">Drill Library</TabsTrigger>
          <TabsTrigger value="plan">Weekly Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="drills" className="space-y-4 mt-4">
          {selectedDrill ? (
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{selectedDrill.name}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDrill(null)}>
                    Back
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{selectedDrill.duration}</span>
                </div>
                <p className="text-sm">{selectedDrill.description}</p>
                <div>
                  <h3 className="text-sm font-semibold mb-2">Steps:</h3>
                  <ol className="space-y-2">
                    {selectedDrill.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="w-6 h-6 rounded-full bg-amber/20 text-amber text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                {selectedDrill.videoUrl && (
                  <a
                    href={selectedDrill.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-amber hover:underline"
                  >
                    Watch tutorial videos
                    <ChevronRight className="w-3 h-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          ) : (
            currentDrills.map((cat) => (
              <Card key={cat.name} className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {cat.icon}
                    {cat.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {cat.drills.map((drill) => (
                    <button
                      key={drill.name}
                      onClick={() => setSelectedDrill(drill)}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border hover:border-amber/40 transition-colors text-left"
                    >
                      <div>
                        <div className="text-sm font-medium">{drill.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {drill.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <Badge variant="outline" className="text-[10px]">
                          {drill.duration}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="plan" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">
                7-Day {role} Training Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {weeklyPlan.map((day, i) => {
                const [dayName, ...rest] = day.split(": ");
                const isRest = rest.join(": ").toLowerCase().includes("rest");
                return (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${
                      isRest
                        ? "bg-amber/5 border-amber/20"
                        : "bg-secondary/30 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={isRest ? "border-amber/50 text-amber" : ""}
                      >
                        {dayName}
                      </Badge>
                      <span className="text-sm">{rest.join(": ")}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
