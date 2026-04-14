import type { AnalysisResult } from "./pose-analysis";

export interface ProPlayer {
  key: string;
  name: string;
  style: string;
  description: string;
  metrics: Record<string, { idealValue: string; numericRef: number }>;
}

export interface ComparisonRow {
  metric: string;
  userValue: string;
  userStatus: string;
  proValue: string;
  difference: string;
  status: "close" | "moderate" | "far";
}

export interface ComparisonResult {
  pro: ProPlayer;
  rows: ComparisonRow[];
  tips: string[];
  matchPercentage: number;
}

export const PRO_PLAYERS: ProPlayer[] = [
  {
    key: "sachin",
    name: "Sachin Tendulkar",
    style: "Textbook Classic",
    description: "The master blaster's stance is considered the gold standard — perfectly balanced with a slight knee bend, level eyes, and compact guard.",
    metrics: {
      "Knee Bend": { idealValue: "155°", numericRef: 155 },
      "Backlift": { idealValue: "Active", numericRef: 0 },
      "Head & Eyes Level": { idealValue: "Perfectly Level", numericRef: 0.01 },
      "Balance": { idealValue: "Centered", numericRef: 0.15 },
      "Shoulder Position": { idealValue: "Level", numericRef: 0.02 },
      "Foot Spacing": { idealValue: "1.1x shoulder width", numericRef: 1.1 },
    },
  },
  {
    key: "kohli",
    name: "Virat Kohli",
    style: "Aggressive Modern",
    description: "Kohli's stance is dynamic and aggressive — deeper knee bend, slightly open chest, strong base for quick weight transfer into drives.",
    metrics: {
      "Knee Bend": { idealValue: "145°", numericRef: 145 },
      "Backlift": { idealValue: "High & Active", numericRef: 0 },
      "Head & Eyes Level": { idealValue: "Level, Still", numericRef: 0.012 },
      "Balance": { idealValue: "Slightly Forward", numericRef: 0.20 },
      "Shoulder Position": { idealValue: "Open Slightly", numericRef: 0.025 },
      "Foot Spacing": { idealValue: "1.3x shoulder width", numericRef: 1.3 },
    },
  },
  {
    key: "dravid",
    name: "Rahul Dravid",
    style: "Defensive Wall",
    description: "The Wall's stance prioritizes stability and patience — minimal movement, perfectly still head, compact and ready to defend for hours.",
    metrics: {
      "Knee Bend": { idealValue: "160°", numericRef: 160 },
      "Backlift": { idealValue: "Compact", numericRef: 0 },
      "Head & Eyes Level": { idealValue: "Dead Still", numericRef: 0.008 },
      "Balance": { idealValue: "Rock Solid", numericRef: 0.12 },
      "Shoulder Position": { idealValue: "Square", numericRef: 0.015 },
      "Foot Spacing": { idealValue: "1.0x shoulder width", numericRef: 1.0 },
    },
  },
];

function parseAngle(value: string): number | null {
  const match = value.match(/([\d.]+)\s*°|degrees/);
  return match ? parseFloat(match[1]) : null;
}

export function compareWithPro(result: AnalysisResult, proKey: string): ComparisonResult {
  const pro = PRO_PLAYERS.find((p) => p.key === proKey) || PRO_PLAYERS[0];
  const rows: ComparisonRow[] = [];
  const deviations: { metric: string; gap: number; tip: string }[] = [];

  let closeCount = 0;

  for (const metric of result.metrics) {
    const proMetric = pro.metrics[metric.name];
    if (!proMetric) continue;

    let status: "close" | "moderate" | "far" = "close";
    let difference = "";

    if (metric.name === "Knee Bend") {
      const userAngle = parseAngle(metric.value);
      if (userAngle !== null) {
        const diff = Math.abs(userAngle - proMetric.numericRef);
        difference = `${diff.toFixed(0)}° difference`;
        status = diff <= 10 ? "close" : diff <= 20 ? "moderate" : "far";
        if (diff > 10) {
          deviations.push({
            metric: metric.name,
            gap: diff,
            tip: userAngle > proMetric.numericRef
              ? `Bend your knees slightly more to match ${pro.name}'s ${proMetric.idealValue} angle`
              : `Straighten up a bit — ${pro.name} uses a ${proMetric.idealValue} knee angle`,
          });
        }
      } else {
        difference = "—";
      }
    } else {
      // For non-angle metrics, compare by status
      if (metric.status === "good") {
        status = "close";
        difference = "Matches pro";
      } else if (metric.status === "warning") {
        status = "moderate";
        difference = "Slightly off";
        deviations.push({
          metric: metric.name,
          gap: 1,
          tip: getTipForMetric(metric.name, pro.name),
        });
      } else {
        status = "far";
        difference = "Needs work";
        deviations.push({
          metric: metric.name,
          gap: 2,
          tip: getTipForMetric(metric.name, pro.name),
        });
      }
    }

    if (status === "close") closeCount++;

    rows.push({
      metric: metric.name,
      userValue: metric.value,
      userStatus: metric.status,
      proValue: proMetric.idealValue,
      difference,
      status,
    });
  }

  // Top 2 biggest deviations as tips
  deviations.sort((a, b) => b.gap - a.gap);
  const tips = deviations.slice(0, 2).map((d) => d.tip);

  if (tips.length === 0) {
    tips.push(`Your stance closely matches ${pro.name}'s technique. Keep it up!`);
  }

  const matchPercentage = Math.round((closeCount / Math.max(rows.length, 1)) * 100);

  return { pro, rows, tips, matchPercentage };
}

function getTipForMetric(metric: string, proName: string): string {
  const tips: Record<string, string> = {
    "Backlift": `Study ${proName}'s backlift position — keep your bat ready and in line with the stumps`,
    "Head & Eyes Level": `${proName} keeps their head dead still at the crease — practice watching the ball with minimal head movement`,
    "Balance": `Work on your weight distribution — ${proName}'s center of gravity stays perfectly between both feet`,
    "Shoulder Position": `${proName} keeps shoulders level and aligned — practice in front of a mirror to correct tilt`,
    "Foot Spacing": `Adjust your base width — ${proName} uses a specific stance width for optimal stability and shot-making`,
  };
  return tips[metric] || `Focus on improving your ${metric.toLowerCase()} to match ${proName}'s technique`;
}
