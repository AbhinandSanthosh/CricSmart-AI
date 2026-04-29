import type { Client } from "@libsql/client";

export interface SeedDrill {
  role: string;
  category: string;
  category_icon: string;
  name: string;
  duration: string;
  description: string;
  steps: string[];
  video_url?: string;
  sort_order: number;
}

export const SEED_DRILLS: SeedDrill[] = [
  // BATTER — Basic Technique
  { role: "Batter", category: "Basic Technique", category_icon: "Target", name: "Shadow Batting", duration: "15 min", description: "Practice your shots without a ball to build muscle memory.", steps: ["Set up in front of a mirror or camera", "Take your batting stance", "Play each shot 20 times: straight drive, cover drive, pull, cut", "Focus on footwork and follow-through"], video_url: "https://www.youtube.com/results?search_query=cricket+shadow+batting+drill", sort_order: 1 },
  { role: "Batter", category: "Basic Technique", category_icon: "Target", name: "Front Foot Defense", duration: "20 min", description: "The bread and butter of batting. Get your defense solid.", steps: ["Partner throws half-volleys from 10m", "Step forward with front foot to pitch of ball", "Keep bat close to pad, angled down", "Soft hands - let the ball die at your feet", "Do 5 sets of 12 balls"], sort_order: 2 },
  { role: "Batter", category: "Basic Technique", category_icon: "Target", name: "Back Foot Practice", duration: "20 min", description: "Handle short-pitched deliveries with confidence.", steps: ["Partner throws short balls from 12m", "Rock back and across on back foot", "Keep head still and eyes level", "Play defensive or cut shot", "Do 5 sets of 12 balls"], sort_order: 3 },

  // BATTER — Hand-Eye Coordination
  { role: "Batter", category: "Hand-Eye Coordination", category_icon: "Zap", name: "Wall Rebound Drill", duration: "10 min", description: "Throw a ball against a wall and catch/hit the rebound.", steps: ["Stand 3m from a wall", "Throw tennis ball at wall", "Hit the rebound with your bat", "Alternate forehand and backhand", "Do 3 sets of 2 minutes"], sort_order: 1 },
  { role: "Batter", category: "Hand-Eye Coordination", category_icon: "Zap", name: "One-Hand Batting", duration: "15 min", description: "Improve bat control by batting with only your top hand.", steps: ["Grip bat with only top hand", "Partner throws gentle tosses", "Focus on timing, not power", "Switch to bottom hand for second set", "Do 3 sets per hand"], sort_order: 2 },
  { role: "Batter", category: "Hand-Eye Coordination", category_icon: "Zap", name: "Colored Ball Drill", duration: "10 min", description: "Different colored balls for different shots.", steps: ["Get 3 colors of tennis balls", "Red = drive, Blue = defend, Green = leave", "Partner throws random colors", "React to color and play correct shot", "Do 4 rounds of 15 balls"], sort_order: 3 },

  // BATTER — Footwork & Movement
  { role: "Batter", category: "Footwork & Movement", category_icon: "Footprints", name: "Ladder Drill", duration: "10 min", description: "Quick feet drills to improve agility between the creases.", steps: ["Lay out an agility ladder", "Run through with both feet in each rung", "Then: one foot per rung (sprint)", "Then: lateral shuffles", "3 sets of each pattern"], sort_order: 1 },
  { role: "Batter", category: "Footwork & Movement", category_icon: "Footprints", name: "Cone Movement Drill", duration: "15 min", description: "Set up cones to simulate running between wickets.", steps: ["Place cones 17.68m apart (pitch length)", "Sprint between cones 10 times", "Focus on turning technique", "Low center of gravity on turns", "Time yourself and try to improve"], sort_order: 2 },

  // BATTER — Power & Shots
  { role: "Batter", category: "Power & Shots", category_icon: "Zap", name: "Range Hitting", duration: "20 min", description: "Practice hitting for maximum distance.", steps: ["Use throwdowns or bowling machine", "Start at 70% power, build to 100%", "Focus on timing the ball at the top of the bounce", "Follow through completely", "Alternate between on-side and off-side lofts"], sort_order: 1 },
  { role: "Batter", category: "Power & Shots", category_icon: "Zap", name: "Target Practice", duration: "15 min", description: "Hit targets placed in different areas of the field.", steps: ["Place cones at cover, mid-wicket, long-on, third man", "Partner bowls varied lengths", "Call the target zone before the ball is bowled", "Score points for hitting the zone", "Play 3 overs (18 balls)"], sort_order: 2 },

  // BATTER — Game Simulation
  { role: "Batter", category: "Game Simulation", category_icon: "Gamepad2", name: "Scenario Practice", duration: "30 min", description: "Simulate real match situations.", steps: ["Scenario: 30 runs needed from 3 overs", "Play against a bowler with fielders", "Manage strike rotation and boundaries", "Practice under pressure with consequences", "Repeat with different scenarios"], sort_order: 1 },

  // BOWLER — Accuracy & Line-Length
  { role: "Bowler", category: "Accuracy & Line-Length", category_icon: "Target", name: "Cone Target Bowling", duration: "20 min", description: "Bowl at specific targets on a good length.", steps: ["Place 4 cones on the pitch", "Bowl 6 balls at each target", "Score yourself: direct hit = 3pts, close = 1pt", "Aim for 30+ points out of 72", "Rest 30 seconds between sets"], sort_order: 1 },
  { role: "Bowler", category: "Accuracy & Line-Length", category_icon: "Target", name: "Yorker Practice", duration: "15 min", description: "Master the death-overs weapon.", steps: ["Place a shoe at batting crease line", "Bowl 30 yorkers aiming at the shoe", "Count how many hit within 1 foot", "Adjust your release point each time", "Target: 15+ on point"], sort_order: 2 },
  { role: "Bowler", category: "Accuracy & Line-Length", category_icon: "Target", name: "Corridor Bowling", duration: "15 min", description: "Bowl consistently in the 4th-5th stump corridor.", steps: ["Mark the corridor with tape/chalk", "Bowl 36 balls (6 overs)", "Count how many land in the corridor", "Aim for 24+ out of 36", "Vary pace while maintaining line"], sort_order: 3 },

  // BOWLER — Run-Up & Rhythm
  { role: "Bowler", category: "Run-Up & Rhythm", category_icon: "Footprints", name: "Marker Run-Up", duration: "10 min", description: "Consistent run-up for consistent bowling.", steps: ["Mark your run-up with tape every stride", "Run through without bowling 5 times", "Check that you hit each marker", "Then bowl 12 balls focusing on rhythm", "Your front foot should land consistently"], sort_order: 1 },
  { role: "Bowler", category: "Run-Up & Rhythm", category_icon: "Footprints", name: "Shadow Bowling", duration: "10 min", description: "Bowl without a ball to focus on action mechanics.", steps: ["Run in and bowl air balls", "Focus on: high arm, hip rotation, follow-through", "Film yourself from side-on", "Compare with a professional bowler's action", "Do 3 sets of 6 deliveries"], sort_order: 2 },

  // BOWLER — Variations
  { role: "Bowler", category: "Variations", category_icon: "Zap", name: "Slower Ball Masterclass", duration: "20 min", description: "Practice all types of slower deliveries.", steps: ["Bowl 6 off-cutters", "Bowl 6 leg-cutters", "Bowl 6 back-of-hand slower balls", "Bowl 6 split-finger slower balls", "Then: random mix of 12"], sort_order: 1 },
  { role: "Bowler", category: "Variations", category_icon: "Zap", name: "Bouncer Mix", duration: "15 min", description: "Vary short balls with full deliveries.", steps: ["Bowl 3 balls: 2 good length + 1 bouncer", "The bouncer should be a surprise", "Vary the bouncer: body line, head height, wide", "Practice consistent action for all deliveries", "Do 6 sets"], sort_order: 2 },

  // WICKETKEEPER — Reflex & Reaction
  { role: "Wicketkeeper", category: "Reflex & Reaction", category_icon: "Zap", name: "Tennis Ball Rapid Fire", duration: "10 min", description: "Sharp reflexes for edges and deflections.", steps: ["Stand behind stumps in full gear", "Partner throws tennis balls from 5m at varied heights", "Catch as many as possible in 2 minutes", "Move laterally for wider balls", "Do 3 sets with 1 min rest"], video_url: "https://www.youtube.com/results?search_query=wicketkeeper+reflex+drill", sort_order: 1 },
  { role: "Wicketkeeper", category: "Reflex & Reaction", category_icon: "Zap", name: "Stumping Practice", duration: "15 min", description: "Quick glove work for spin bowling.", steps: ["Bowler bowls spin from 18m", "Batter plays and misses deliberately", "Take the ball and break stumps in one motion", "Practice collecting on both sides", "Do 20 stumpings per session"], sort_order: 2 },

  // WICKETKEEPER — Footwork & Positioning
  { role: "Wicketkeeper", category: "Footwork & Positioning", category_icon: "Footprints", name: "Lateral Movement Drill", duration: "15 min", description: "Move quickly to take wide deliveries.", steps: ["Set up with cones 2m apart behind stumps", "Partner throws balls alternating left and right", "Dive and collect cleanly", "Return to center position each time", "Do 3 sets of 20 balls"], sort_order: 1 },
  { role: "Wicketkeeper", category: "Footwork & Positioning", category_icon: "Footprints", name: "Standing Up Drill", duration: "15 min", description: "Practice standing up to the stumps for medium pace.", steps: ["Stand up to stumps with medium-pace bowling", "Focus on watching the ball onto the gloves", "Practice taking clean on both sides", "Work on timing for stumpings", "Build up speed gradually"], sort_order: 2 },

  // WICKETKEEPER — Catching & Diving
  { role: "Wicketkeeper", category: "Catching & Diving", category_icon: "Shield", name: "Edge Catching", duration: "15 min", description: "Simulate edge catches at match speed.", steps: ["Use bat and ball to create edge deflections", "Stand at normal keeping distance", "Focus on moving feet first, then hands", "Practice both regulation and diving catches", "Do 3 sets of 10 edges"], sort_order: 1 },
  { role: "Wicketkeeper", category: "Catching & Diving", category_icon: "Shield", name: "High Ball Catching", duration: "10 min", description: "Take high catches from skied deliveries.", steps: ["Partner throws/hits high catches", "Call early and move into position", "Watch the ball into the gloves", "Practice catching with sun in eyes", "Do 2 sets of 15 catches"], sort_order: 2 },

  // FIELDING — Ground Fielding
  { role: "Fielding", category: "Ground Fielding", category_icon: "Target", name: "Pick-Up & Throw", duration: "15 min", description: "Clean ground fielding and accurate throws.", steps: ["Partner rolls balls to your left and right", "Attack the ball, pick up cleanly", "Throw to single stump from 20m", "Aim for direct hits", "Do 3 sets of 15 balls per side"], sort_order: 1 },
  { role: "Fielding", category: "Ground Fielding", category_icon: "Target", name: "Sliding Stop", duration: "10 min", description: "Save boundaries with the sliding stop technique.", steps: ["Sprint to a rolling ball near the boundary", "Slide on your side to intercept", "Collect and throw in one motion", "Practice on both sides", "Do 3 sets of 10 sprints"], sort_order: 2 },
  { role: "Fielding", category: "Ground Fielding", category_icon: "Target", name: "Rapid Return Drill", duration: "10 min", description: "Fast pick-up and return under pressure.", steps: ["Stand 15m from stumps", "Ball is hit/rolled towards you", "Pick up and throw in under 2 seconds", "Alternate between underarm and overarm", "Track your accuracy over 20 balls"], sort_order: 3 },

  // FIELDING — Catching
  { role: "Fielding", category: "Catching", category_icon: "Shield", name: "High Catch Practice", duration: "15 min", description: "Take high catches with confidence.", steps: ["Use a tennis racket or throwdowns for height", "Call loudly and get under the ball early", "Hands form a reverse cup above eye level", "Watch the ball into your hands", "Do 3 sets of 12 catches"], sort_order: 1 },
  { role: "Fielding", category: "Catching", category_icon: "Shield", name: "Slip Catching", duration: "15 min", description: "Sharp reaction catches in the slip cordon.", steps: ["Stand in slip position", "Partner edges balls using bat", "Start with slow edges, build pace", "Focus on soft hands and watching the ball late", "Do 3 sets of 15 catches"], video_url: "https://www.youtube.com/results?search_query=cricket+slip+catching+drill", sort_order: 2 },
  { role: "Fielding", category: "Catching", category_icon: "Shield", name: "One-Hand Catching", duration: "10 min", description: "Extend your range with one-handed grabs.", steps: ["Partner throws balls just out of two-hand reach", "Dive or stretch to catch with one hand", "Practice left and right", "Focus on cushioning the ball", "Do 2 sets of 10 per side"], sort_order: 3 },

  // FIELDING — Agility & Speed
  { role: "Fielding", category: "Agility & Speed", category_icon: "Footprints", name: "Boundary Sprint Drill", duration: "10 min", description: "Sprint, collect, and relay from the boundary.", steps: ["Start on the boundary rope", "Sprint to collect a ball 20m infield", "Relay throw to keeper on the turn", "Jog back and repeat", "Do 3 sets of 8 sprints"], sort_order: 1 },
  { role: "Fielding", category: "Agility & Speed", category_icon: "Footprints", name: "Reaction Ball Drill", duration: "10 min", description: "Improve reflexes with unpredictable bounces.", steps: ["Use a reaction ball (uneven bounce)", "Throw against a wall", "React to the random bounce direction", "Catch cleanly if possible", "Do 3 sets of 2 minutes"], sort_order: 2 },

  // FIELDING — Throwing Accuracy
  { role: "Fielding", category: "Throwing Accuracy", category_icon: "Eye", name: "Single Stump Target", duration: "15 min", description: "Hit a single stump from various distances.", steps: ["Start at 15m, throw at single stump", "Move back 5m after every 3 hits", "Track accuracy at each distance", "Use both flat throws and lobs", "Goal: 3 hits from 30m+"], sort_order: 1 },
  { role: "Fielding", category: "Throwing Accuracy", category_icon: "Eye", name: "Run-Out Practice", duration: "15 min", description: "Simulate match run-out situations.", steps: ["Batter runs between wickets", "Field ball and throw to either end", "Focus on quick release", "Practice direct hits and backing up", "Do 3 sets of 10 attempts"], sort_order: 2 },

  // ALL-ROUNDER — Bowl-Bat Cycle
  { role: "All-Rounder", category: "Bowl-Bat Cycle", category_icon: "Dumbbell", name: "Transition Drill", duration: "40 min", description: "Bowl 6 then face 6 - simulate match conditions.", steps: ["Bowl a full over with match intensity", "Immediately pad up and face 6 balls", "Repeat 4 times (8 overs total)", "Focus on switching mindset between roles", "Track your bowling accuracy and batting strike rate"], sort_order: 1 },
  { role: "All-Rounder", category: "Bowl-Bat Cycle", category_icon: "Dumbbell", name: "Pressure Switch", duration: "30 min", description: "Defend 10 runs then chase 10 runs.", steps: ["As bowler: defend 10 runs in 2 overs", "As batter: chase 10 runs in 2 overs", "Alternate roles with a partner", "Keep score - loser does 10 push-ups", "Best of 5 rounds"], sort_order: 2 },
];

export async function seedDrills(client: Client): Promise<void> {
  const count = await client.execute("SELECT COUNT(*) as n FROM drills");
  const n = (count.rows[0]?.n as number) ?? 0;
  if (n > 0) return;

  for (const d of SEED_DRILLS) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO drills (role, category, category_icon, name, duration, description, steps, video_url, sort_order, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [d.role, d.category, d.category_icon, d.name, d.duration, d.description, JSON.stringify(d.steps), d.video_url || "", d.sort_order],
    });
  }
}
