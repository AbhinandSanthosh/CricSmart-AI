// Cricket stance analysis using MediaPipe pose landmarks
// 33-point BlazePose model

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface AnalysisResult {
  score: number;
  metrics: Metric[];
  summary: string;
}

export interface Metric {
  name: string;
  value: string;
  status: "good" | "warning" | "critical";
  feedback: string;
  deduction: number;
}

// MediaPipe landmark indices
const NOSE = 0;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_KNEE = 25;
const RIGHT_KNEE = 26;
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;

function angleBetween(a: Landmark, b: Landmark, c: Landmark): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
  if (magBA === 0 || magBC === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

function distance(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function analyzeStance(landmarks: Landmark[]): AnalysisResult {
  const metrics: Metric[] = [];
  let totalDeduction = 0;

  // 1. Back Leg Knee Bend (target 150-170 degrees)
  const leftKneeAngle = angleBetween(landmarks[LEFT_HIP], landmarks[LEFT_KNEE], landmarks[LEFT_ANKLE]);
  const rightKneeAngle = angleBetween(landmarks[RIGHT_HIP], landmarks[RIGHT_KNEE], landmarks[RIGHT_ANKLE]);
  const backKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);

  if (backKneeAngle >= 150 && backKneeAngle <= 170) {
    metrics.push({ name: "Back Leg Knee Bend", value: `${backKneeAngle.toFixed(0)}°`, status: "good", feedback: "Good knee bend - athletic ready position", deduction: 0 });
  } else if (backKneeAngle > 170) {
    const ded = 25;
    totalDeduction += ded;
    metrics.push({ name: "Back Leg Knee Bend", value: `${backKneeAngle.toFixed(0)}°`, status: "critical", feedback: "Legs too stiff. Bend your knees slightly for a more athletic stance.", deduction: ded });
  } else {
    const ded = 10;
    totalDeduction += ded;
    metrics.push({ name: "Back Leg Knee Bend", value: `${backKneeAngle.toFixed(0)}°`, status: "warning", feedback: "Too much knee bend. Straighten slightly for better balance.", deduction: ded });
  }

  // 2. Lead Elbow Height (elbow should be above hip - angle > 90)
  const leftElbowAngle = angleBetween(landmarks[LEFT_SHOULDER], landmarks[LEFT_ELBOW], landmarks[LEFT_WRIST]);
  const rightElbowAngle = angleBetween(landmarks[RIGHT_SHOULDER], landmarks[RIGHT_ELBOW], landmarks[RIGHT_WRIST]);
  const leadElbow = Math.max(leftElbowAngle, rightElbowAngle);

  if (leadElbow > 90) {
    metrics.push({ name: "Lead Elbow Height", value: `${leadElbow.toFixed(0)}°`, status: "good", feedback: "Good elbow position for bat lift", deduction: 0 });
  } else {
    const ded = 20;
    totalDeduction += ded;
    metrics.push({ name: "Lead Elbow Height", value: `${leadElbow.toFixed(0)}°`, status: "critical", feedback: "Elbow too low. Raise your lead elbow for better bat control.", deduction: ded });
  }

  // 3. Eye Alignment & Balance (head should be centered over feet)
  const nose = landmarks[NOSE];
  const midFoot = {
    x: (landmarks[LEFT_ANKLE].x + landmarks[RIGHT_ANKLE].x) / 2,
    y: (landmarks[LEFT_ANKLE].y + landmarks[RIGHT_ANKLE].y) / 2,
    z: 0,
    visibility: 1,
  };
  const headOffset = Math.abs(nose.x - midFoot.x);

  if (headOffset < 0.08) {
    metrics.push({ name: "Eye Alignment & Balance", value: "Centered", status: "good", feedback: "Head well positioned over base - good balance", deduction: 0 });
  } else if (headOffset < 0.15) {
    const ded = 10;
    totalDeduction += ded;
    metrics.push({ name: "Eye Alignment & Balance", value: "Slight offset", status: "warning", feedback: "Head slightly off-center. Keep your eyes level and head still.", deduction: ded });
  } else {
    const ded = 20;
    totalDeduction += ded;
    metrics.push({ name: "Eye Alignment & Balance", value: "Off-balance", status: "critical", feedback: "Head significantly off-center. Center your weight for better balance.", deduction: ded });
  }

  // 4. Shoulder Alignment
  const shoulderDiff = Math.abs(landmarks[LEFT_SHOULDER].y - landmarks[RIGHT_SHOULDER].y);

  if (shoulderDiff < 0.03) {
    metrics.push({ name: "Shoulder Alignment", value: "Level", status: "good", feedback: "Shoulders well aligned - side-on stance", deduction: 0 });
  } else if (shoulderDiff < 0.06) {
    const ded = 8;
    totalDeduction += ded;
    metrics.push({ name: "Shoulder Alignment", value: "Slight tilt", status: "warning", feedback: "Minor shoulder tilt detected. Keep shoulders more level.", deduction: ded });
  } else {
    const ded = 15;
    totalDeduction += ded;
    metrics.push({ name: "Shoulder Alignment", value: "Tilted", status: "critical", feedback: "Significant shoulder tilt. Square up your shoulders.", deduction: ded });
  }

  // 5. Foot Alignment
  const footDist = distance(landmarks[LEFT_ANKLE], landmarks[RIGHT_ANKLE]);
  const shoulderDist = distance(landmarks[LEFT_SHOULDER], landmarks[RIGHT_SHOULDER]);
  const footToShoulder = footDist / (shoulderDist || 0.001);

  if (footToShoulder >= 0.8 && footToShoulder <= 1.5) {
    metrics.push({ name: "Foot Alignment", value: "Good width", status: "good", feedback: "Feet properly spaced for a stable base", deduction: 0 });
  } else if (footToShoulder < 0.8) {
    const ded = 10;
    totalDeduction += ded;
    metrics.push({ name: "Foot Alignment", value: "Too narrow", status: "warning", feedback: "Stance too narrow. Widen your feet to shoulder width.", deduction: ded });
  } else {
    const ded = 15;
    totalDeduction += ded;
    metrics.push({ name: "Foot Alignment", value: "Too wide", status: "critical", feedback: "Stance too wide. Bring feet closer for better movement.", deduction: ded });
  }

  // 6. Stance Width relative to torso height
  const torsoHeight = distance(
    { x: (landmarks[LEFT_SHOULDER].x + landmarks[RIGHT_SHOULDER].x) / 2, y: (landmarks[LEFT_SHOULDER].y + landmarks[RIGHT_SHOULDER].y) / 2, z: 0, visibility: 1 },
    { x: (landmarks[LEFT_HIP].x + landmarks[RIGHT_HIP].x) / 2, y: (landmarks[LEFT_HIP].y + landmarks[RIGHT_HIP].y) / 2, z: 0, visibility: 1 }
  );
  const stanceRatio = footDist / (torsoHeight || 0.001);

  if (stanceRatio >= 0.8 && stanceRatio <= 1.5) {
    metrics.push({ name: "Stance Width", value: `${stanceRatio.toFixed(1)}x`, status: "good", feedback: "Stance width proportional to torso - well balanced", deduction: 0 });
  } else {
    const ded = 10;
    totalDeduction += ded;
    metrics.push({ name: "Stance Width", value: `${stanceRatio.toFixed(1)}x`, status: "warning", feedback: "Stance width not proportional. Aim for 0.8-1.5x torso height.", deduction: ded });
  }

  const score = Math.max(0, 100 - totalDeduction);

  let summary: string;
  if (score >= 85) summary = "Excellent stance! Minor tweaks at most. You're match-ready.";
  else if (score >= 70) summary = "Good foundation. Focus on the highlighted areas to level up.";
  else if (score >= 50) summary = "Decent start. Work on the critical areas during practice.";
  else summary = "Needs significant work. Focus on basics: knee bend, balance, and shoulder alignment.";

  return { score, metrics, summary };
}

// Skeleton connections for drawing
export const POSE_CONNECTIONS: [number, number][] = [
  [LEFT_SHOULDER, RIGHT_SHOULDER],
  [LEFT_SHOULDER, LEFT_ELBOW],
  [LEFT_ELBOW, LEFT_WRIST],
  [RIGHT_SHOULDER, RIGHT_ELBOW],
  [RIGHT_ELBOW, RIGHT_WRIST],
  [LEFT_SHOULDER, LEFT_HIP],
  [RIGHT_SHOULDER, RIGHT_HIP],
  [LEFT_HIP, RIGHT_HIP],
  [LEFT_HIP, LEFT_KNEE],
  [LEFT_KNEE, LEFT_ANKLE],
  [RIGHT_HIP, RIGHT_KNEE],
  [RIGHT_KNEE, RIGHT_ANKLE],
];
