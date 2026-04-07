// Cricket stance analysis using MediaPipe pose landmarks
// 33-point BlazePose model
// Compares against professional batting stances (Sachin, Dravid, Kohli)

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
  proComparison: string;
}

export interface Metric {
  name: string;
  value: string;
  status: "good" | "warning" | "critical";
  feedback: string;
  tip: string;
  deduction: number;
}

// MediaPipe landmark indices
const NOSE = 0;
const LEFT_EYE = 2;
const RIGHT_EYE = 5;
const LEFT_EAR = 7;
const RIGHT_EAR = 8;
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

// -----------------------------------------------------------------------------
// Batsman detection
// -----------------------------------------------------------------------------
// MediaPipe returns one skeleton per visible person. In a cricket scene the
// camera often catches the batter, the wicketkeeper (crouched behind stumps),
// the bowler (mid-delivery), the umpire, or other fielders. If we blindly pick
// the first landmark set, we frequently analyse the wrong person. This scorer
// filters candidates using cricket-specific pose heuristics so that only a
// plausible batting stance is accepted.

export interface BatsmanScore {
  score: number;
  reasons: string[];
  disqualified: boolean;
  disqualifier: string | null;
}

export function scoreBatsmanCandidate(landmarks: Landmark[]): BatsmanScore {
  const reasons: string[] = [];

  // Guard: require the core landmarks we rely on. If MediaPipe didn't see the
  // person clearly (hip/knee/shoulder invisible), they can't be a valid batter.
  const required = [
    LEFT_SHOULDER, RIGHT_SHOULDER,
    LEFT_HIP, RIGHT_HIP,
    LEFT_KNEE, RIGHT_KNEE,
    LEFT_ANKLE, RIGHT_ANKLE,
    LEFT_WRIST, RIGHT_WRIST,
    NOSE,
  ];
  for (const idx of required) {
    if (!landmarks[idx] || landmarks[idx].visibility < 0.35) {
      return { score: 0, reasons: ["core landmarks not visible"], disqualified: true, disqualifier: "low_visibility" };
    }
  }

  // Basic geometry
  const midShoulderY = (landmarks[LEFT_SHOULDER].y + landmarks[RIGHT_SHOULDER].y) / 2;
  const midHipY = (landmarks[LEFT_HIP].y + landmarks[RIGHT_HIP].y) / 2;
  const midAnkleY = (landmarks[LEFT_ANKLE].y + landmarks[RIGHT_ANKLE].y) / 2;
  const torsoHeight = Math.abs(midHipY - midShoulderY) || 0.001;
  const bodyHeight = Math.abs(midAnkleY - midShoulderY) || 0.001;
  const shoulderWidth = Math.abs(landmarks[LEFT_SHOULDER].x - landmarks[RIGHT_SHOULDER].x) || 0.001;

  const leftKneeAngle = angleBetween(landmarks[LEFT_HIP], landmarks[LEFT_KNEE], landmarks[LEFT_ANKLE]);
  const rightKneeAngle = angleBetween(landmarks[RIGHT_HIP], landmarks[RIGHT_KNEE], landmarks[RIGHT_ANKLE]);
  const minKnee = Math.min(leftKneeAngle, rightKneeAngle);
  const maxKnee = Math.max(leftKneeAngle, rightKneeAngle);

  // Wrist heights relative to shoulders (positive = wrists above shoulders)
  const leftWristRel = (midShoulderY - landmarks[LEFT_WRIST].y) / torsoHeight;
  const rightWristRel = (midShoulderY - landmarks[RIGHT_WRIST].y) / torsoHeight;
  const topWristRel = Math.max(leftWristRel, rightWristRel);

  // Ankle spread
  const ankleGapX = Math.abs(landmarks[LEFT_ANKLE].x - landmarks[RIGHT_ANKLE].x);
  const ankleGapY = Math.abs(landmarks[LEFT_ANKLE].y - landmarks[RIGHT_ANKLE].y);
  const footToShoulder = ankleGapX / shoulderWidth;

  // ----- DISQUALIFIERS -----

  // 1. Wicketkeeper crouch — knees deeply bent (< 135°) AND hips barely above knees.
  //    The keeper's torso is compact: hips fold down over knees so the vertical
  //    distance from hip to knee is small relative to body height.
  const leftHipToKneeY = Math.abs(landmarks[LEFT_HIP].y - landmarks[LEFT_KNEE].y);
  const rightHipToKneeY = Math.abs(landmarks[RIGHT_HIP].y - landmarks[RIGHT_KNEE].y);
  const minHipToKneeRatio = Math.min(leftHipToKneeY, rightHipToKneeY) / bodyHeight;
  if (minKnee < 135 && minHipToKneeRatio < 0.22) {
    return {
      score: 0,
      reasons: [`wicketkeeper crouch (knee=${minKnee.toFixed(0)}°, hipToKnee=${minHipToKneeRatio.toFixed(2)})`],
      disqualified: true,
      disqualifier: "wicketkeeper_crouch",
    };
  }

  // 2. Bowler mid-delivery — the bowling arm is raised well above the head.
  //    A batter in their stance never has wrists more than ~1 torso above shoulders.
  if (topWristRel > 1.6) {
    return {
      score: 0,
      reasons: [`bowler delivery arm raised (topWristRel=${topWristRel.toFixed(2)})`],
      disqualified: true,
      disqualifier: "bowler_arm_raised",
    };
  }

  // 3. Bowler gather/leap — feet vertically separated (mid-stride / airborne)
  //    AND one knee nearly straight (driving leg). Batters stand level on both feet.
  if (ankleGapY / bodyHeight > 0.12 && maxKnee > 165) {
    return {
      score: 0,
      reasons: [`mid-stride bowler pose (ankleGapY=${(ankleGapY/bodyHeight).toFixed(2)}, maxKnee=${maxKnee.toFixed(0)}°)`],
      disqualified: true,
      disqualifier: "mid_stride",
    };
  }

  // 4. Wide stride (delivery stride / lunge) — feet spread more than 3× shoulder width.
  if (footToShoulder > 3.0) {
    return {
      score: 0,
      reasons: [`wide delivery stride (footToShoulder=${footToShoulder.toFixed(2)})`],
      disqualified: true,
      disqualifier: "wide_stride",
    };
  }

  // 5. Body span too small — person is too far away / cropped.
  //    Can't reliably measure a stance.
  if (bodyHeight < 0.18) {
    return {
      score: 0,
      reasons: [`body too small in frame (bodyHeight=${bodyHeight.toFixed(2)})`],
      disqualified: true,
      disqualifier: "body_too_small",
    };
  }

  // 6. Upside-down / non-standing — shoulders should be above hips which should
  //    be above ankles (remember: y grows downward in image space).
  if (!(midShoulderY < midHipY - 0.02 && midHipY < midAnkleY - 0.02)) {
    return {
      score: 0,
      reasons: ["not standing upright (shoulders/hips/ankles misordered)"],
      disqualified: true,
      disqualifier: "not_upright",
    };
  }

  // ----- REQUIRED BATTER SIGNAL -----
  // A batter is distinguished from other upright standing people (umpire,
  // fielder, drinks-runner) by how they hold their hands: either both wrists
  // close together on the bat, OR both wrists raised in front of the body
  // at similar height. Without at least one of these, we cannot call this
  // person a batter regardless of their legs/torso posture.
  const wristGap = distance(landmarks[LEFT_WRIST], landmarks[RIGHT_WRIST]);
  const hasTwoHandedGrip = wristGap / shoulderWidth < 0.7;
  const wristsInBatterRange = topWristRel > -0.25 && topWristRel < 1.2;
  // Wrists must be at similar height (both on bat). If one is much higher
  // than the other the person is pointing, fielding, or bowling.
  const leftWristY = landmarks[LEFT_WRIST].y;
  const rightWristY = landmarks[RIGHT_WRIST].y;
  const wristHeightDiff = Math.abs(leftWristY - rightWristY) / torsoHeight;
  const wristsAtSimilarHeight = wristHeightDiff < 0.5;

  if (!hasTwoHandedGrip && !(wristsInBatterRange && wristsAtSimilarHeight)) {
    return {
      score: 0,
      reasons: [`no batter grip signal (grip=${hasTwoHandedGrip}, range=${wristsInBatterRange}, level=${wristsAtSimilarHeight})`],
      disqualified: true,
      disqualifier: "no_batter_grip",
    };
  }

  // ----- POSITIVE SCORING (out of 100) -----
  let score = 0;

  // (a) Upright knees in batter range 140-178° — batters have a slight bend, not a crouch.
  if (minKnee >= 140 && minKnee <= 178) {
    score += 25;
    reasons.push(`upright knees (${minKnee.toFixed(0)}°)`);
  } else if (minKnee >= 125 && minKnee < 140) {
    score += 12;
    reasons.push(`slight crouch knees (${minKnee.toFixed(0)}°)`);
  }

  // (b) Wrists in batter range — above waist but not above head.
  if (wristsInBatterRange) {
    score += 20;
    reasons.push(`wrists in batter range (${topWristRel.toFixed(2)})`);
  }

  // (c) Two-handed grip — the wrists are close together (both on the bat).
  if (hasTwoHandedGrip) {
    score += 15;
    reasons.push(`two-handed grip (wristGap=${(wristGap/shoulderWidth).toFixed(2)})`);
  }

  // (d) Feet shoulder-width apart (0.6-2.4× shoulder width) — a proper batting base.
  if (footToShoulder >= 0.6 && footToShoulder <= 2.4) {
    score += 15;
    reasons.push(`shoulder-width feet (${footToShoulder.toFixed(2)})`);
  }

  // (e) Body mostly vertical — head above shoulders above hips above ankles.
  const nose = landmarks[NOSE];
  if (nose.y < midShoulderY - 0.02) {
    score += 10;
    reasons.push("head above shoulders");
  }

  // (f) Ankles roughly level (not mid-stride).
  if (ankleGapY / bodyHeight < 0.08) {
    score += 10;
    reasons.push("ankles level");
  }

  // (g) Body fills a reasonable portion of the frame.
  if (bodyHeight > 0.3) {
    score += 5;
    reasons.push("good body framing");
  }

  return { score, reasons, disqualified: false, disqualifier: null };
}

export interface BatsmanSelection {
  index: number;
  landmarks: Landmark[] | null;
  score: number;
  reason: string;
  rejected: { index: number; reason: string }[];
}

/**
 * Pick the most batter-like person out of MediaPipe's multi-pose output.
 * Returns `{ landmarks: null, reason }` if no candidate looks like a batter.
 */
export function selectBatsman(candidates: Landmark[][]): BatsmanSelection {
  if (!candidates || candidates.length === 0) {
    return { index: -1, landmarks: null, score: 0, reason: "no people detected", rejected: [] };
  }

  const scored = candidates.map((lm, index) => ({ index, landmarks: lm, ...scoreBatsmanCandidate(lm) }));

  // Keep valid (non-disqualified) candidates with score >= 40
  const valid = scored.filter(c => !c.disqualified && c.score >= 40);
  const rejected = scored
    .filter(c => c.disqualified || c.score < 40)
    .map(c => ({
      index: c.index,
      reason: c.disqualified ? (c.disqualifier || "disqualified") : `low batter score (${c.score})`,
    }));

  if (valid.length === 0) {
    const bestRejected = scored.reduce((a, b) => (a.score > b.score ? a : b));
    return {
      index: -1,
      landmarks: null,
      score: bestRejected.score,
      reason: bestRejected.disqualified
        ? `no batter detected — closest pose looked like a ${bestRejected.disqualifier?.replace(/_/g, " ")}`
        : "no batter detected — no one in a batting stance",
      rejected,
    };
  }

  // Highest-scoring valid candidate wins
  const best = valid.reduce((a, b) => (a.score > b.score ? a : b));
  return {
    index: best.index,
    landmarks: best.landmarks,
    score: best.score,
    reason: best.reasons.join(", "),
    rejected,
  };
}

// Pro reference ranges (based on analysis of professional stances)
const PRO_RANGES = {
  kneeAngle: { min: 150, max: 170, label: "Sachin & Kohli keep a slight knee bend (150-170°) for quick movement" },
  elbowAngle: { min: 90, max: 160, label: "Dravid's backlift — elbow high, bat face open, wrists cocked" },
  headOffset: { max: 0.06, label: "Kohli keeps his head dead still over middle stump — eyes level" },
  shoulderDiff: { max: 0.03, label: "Sachin's side-on stance — shoulders level, pointing to bowler" },
  eyeLevel: { max: 0.015, label: "Dravid's eyes are always perfectly level — watch the ball all the way" },
  backliftAngle: { min: 100, max: 160, label: "Kohli's compact backlift — bat comes from gully, wrists above shoulder" },
};

export function analyzeStance(landmarks: Landmark[]): AnalysisResult {
  const metrics: Metric[] = [];
  let totalDeduction = 0;

  // 1. Back Leg Knee Bend (target 150-170 degrees)
  const leftKneeAngle = angleBetween(landmarks[LEFT_HIP], landmarks[LEFT_KNEE], landmarks[LEFT_ANKLE]);
  const rightKneeAngle = angleBetween(landmarks[RIGHT_HIP], landmarks[RIGHT_KNEE], landmarks[RIGHT_ANKLE]);
  const backKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);

  if (backKneeAngle >= 150 && backKneeAngle <= 170) {
    metrics.push({ name: "Knee Bend", value: `${backKneeAngle.toFixed(0)}°`, status: "good", feedback: "Your knees are nicely bent — you're in an athletic ready position, just like the pros.", tip: PRO_RANGES.kneeAngle.label, deduction: 0 });
  } else if (backKneeAngle > 170) {
    const ded = 25;
    totalDeduction += ded;
    metrics.push({ name: "Knee Bend", value: `${backKneeAngle.toFixed(0)}°`, status: "critical", feedback: "Your legs are too stiff and straight. You won't be able to move quickly to short or full deliveries.", tip: "Bend your knees slightly — imagine sitting on a high stool. " + PRO_RANGES.kneeAngle.label, deduction: ded });
  } else if (backKneeAngle < 130) {
    const ded = 15;
    totalDeduction += ded;
    metrics.push({ name: "Knee Bend", value: `${backKneeAngle.toFixed(0)}°`, status: "warning", feedback: "You're crouching too low. This will tire your legs and slow your reaction time.", tip: "Stand a bit taller — your knees should be soft, not deeply bent.", deduction: ded });
  } else {
    const ded = 8;
    totalDeduction += ded;
    metrics.push({ name: "Knee Bend", value: `${backKneeAngle.toFixed(0)}°`, status: "warning", feedback: "Slightly too much bend. A bit more upright will help your balance.", tip: PRO_RANGES.kneeAngle.label, deduction: ded });
  }

  // 2. Backlift Detection (wrist height relative to shoulders)
  // Note: MediaPipe can't detect the bat itself, so we infer backlift from wrist/elbow position.
  // A pre-delivery "ready position" with the bat grounded (Kohli, Dravid, Smith style) is a
  // valid professional stance and should NOT be penalized.
  const midShoulderY = (landmarks[LEFT_SHOULDER].y + landmarks[RIGHT_SHOULDER].y) / 2;
  const midHipY = (landmarks[LEFT_HIP].y + landmarks[RIGHT_HIP].y) / 2;
  const torsoHeight = Math.abs(midHipY - midShoulderY) || 0.2;  // scale reference
  // Wrist vertical position relative to shoulders, normalized by torso height (scale-invariant)
  const leftWristRel = (midShoulderY - landmarks[LEFT_WRIST].y) / torsoHeight;
  const rightWristRel = (midShoulderY - landmarks[RIGHT_WRIST].y) / torsoHeight;
  const topWristRel = Math.max(leftWristRel, rightWristRel);
  // Also check elbow angle for backlift
  const leftElbowAngle = angleBetween(landmarks[LEFT_SHOULDER], landmarks[LEFT_ELBOW], landmarks[LEFT_WRIST]);
  const rightElbowAngle = angleBetween(landmarks[RIGHT_SHOULDER], landmarks[RIGHT_ELBOW], landmarks[RIGHT_WRIST]);
  const topElbowAngle = Math.max(leftElbowAngle, rightElbowAngle);

  // Classify backlift position — only two valid states:
  // - active: wrists clearly above shoulders (bat lifted high and cocked)
  // - ready: anything else that's a normal batting stance (bat at any position from
  //   shoulder-level down to grounded, including Kohli/Dravid/Smith tap style).
  // MediaPipe cannot see the bat itself, so we shouldn't penalize a grounded bat.
  // Every natural batting stance is valid — we only recognize "active" vs "ready".
  const activeBacklift = topWristRel > 0.15 && topElbowAngle >= 85;

  if (activeBacklift) {
    metrics.push({ name: "Backlift", value: `${topElbowAngle.toFixed(0)}°`, status: "good", feedback: "Excellent active backlift! Your bat is raised and ready — you'll generate great power through the shot.", tip: PRO_RANGES.backliftAngle.label, deduction: 0 });
  } else {
    // Ready position — bat grounded, tapped, or held low pre-delivery.
    // This is a valid professional technique (Kohli, Dravid, Smith). Zero deduction.
    metrics.push({
      name: "Backlift",
      value: "Ready position",
      status: "good",
      feedback: "Bat in ready position — classic pre-delivery stance like Kohli, Dravid, and Steve Smith. Your backlift will come up smoothly as the bowler runs in.",
      tip: "Pro tip: grounded bat is perfectly fine pre-delivery. Focus on a straight, controlled backlift when the bowler loads up.",
      deduction: 0,
    });
  }

  // 3. Head & Eye Level (CRITICAL — eyes must be parallel/level)
  const leftEye = landmarks[LEFT_EYE];
  const rightEye = landmarks[RIGHT_EYE];
  const eyeTilt = Math.abs(leftEye.y - rightEye.y);
  const nose = landmarks[NOSE];

  // Also check ear alignment for head tilt
  const leftEar = landmarks[LEFT_EAR];
  const rightEar = landmarks[RIGHT_EAR];
  const earTilt = Math.abs(leftEar.y - rightEar.y);
  const headTilt = Math.max(eyeTilt, earTilt);

  if (headTilt < 0.015) {
    metrics.push({ name: "Head & Eyes Level", value: "Level", status: "good", feedback: "Your head is perfectly still and eyes are level — this gives you the best view of the ball from the bowler's hand.", tip: PRO_RANGES.eyeLevel.label, deduction: 0 });
  } else if (headTilt < 0.03) {
    const ded = 10;
    totalDeduction += ded;
    metrics.push({ name: "Head & Eyes Level", value: "Slight tilt", status: "warning", feedback: "Your head is slightly tilted. Even a small tilt changes how you see the ball — it makes judging length harder.", tip: "Keep your chin level and both eyes at the same height. Imagine a spirit level across your eyes.", deduction: ded });
  } else {
    const ded = 20;
    totalDeduction += ded;
    metrics.push({ name: "Head & Eyes Level", value: "Tilted", status: "critical", feedback: "Your head is significantly tilted! You're seeing the ball at an angle, which makes it very hard to judge line and length accurately.", tip: "This is the #1 thing to fix. " + PRO_RANGES.eyeLevel.label, deduction: ded });
  }

  // 4. Balance — Hip stability over feet base (NOT head over feet)
  // In a proper side-on cricket stance, the batsman leans FORWARD over the front foot,
  // so the head (nose) is naturally offset from the foot center. The real measure of
  // balance is whether the HIPS (center of mass) are stable over the feet, and whether
  // the head isn't dramatically offset from the hips (upper body vertical stability).
  const midFoot = {
    x: (landmarks[LEFT_ANKLE].x + landmarks[RIGHT_ANKLE].x) / 2,
    y: (landmarks[LEFT_ANKLE].y + landmarks[RIGHT_ANKLE].y) / 2,
    z: 0,
    visibility: 1,
  };
  const hipCenterX = (landmarks[LEFT_HIP].x + landmarks[RIGHT_HIP].x) / 2;
  const shoulderY = (landmarks[LEFT_SHOULDER].y + landmarks[RIGHT_SHOULDER].y) / 2;
  // Body height (shoulders to ankles) — used as scale reference so the metric is
  // invariant to how zoomed-in the image is.
  const bodyHeight = Math.abs(midFoot.y - shoulderY) || 0.5;

  // Hip offset from feet — hips should be nearly vertically above feet (core stability)
  const hipLean = Math.abs(hipCenterX - midFoot.x) / bodyHeight;
  // Head offset from hips — head can lean forward in a cricket stance, so this is lenient
  const headLean = Math.abs(nose.x - hipCenterX) / bodyHeight;
  // Combined: hip stability matters most (70%), head forward-lean is secondary (30%)
  const combinedLean = 0.7 * hipLean + 0.3 * headLean;

  if (combinedLean < 0.28) {
    metrics.push({ name: "Balance", value: "Centered", status: "good", feedback: "Your weight is evenly distributed and hips are stable over your base — great balance for playing any shot.", tip: PRO_RANGES.headOffset.label, deduction: 0 });
  } else if (combinedLean < 0.45) {
    const ded = 6;
    totalDeduction += ded;
    metrics.push({ name: "Balance", value: "Slight lean", status: "warning", feedback: "You're leaning slightly to one side. A small lean forward over the front foot is fine, but watch you don't tip too far.", tip: "Keep your hips stable over your feet. A small forward lean into the shot is OK.", deduction: ded });
  } else {
    const ded = 12;
    totalDeduction += ded;
    metrics.push({ name: "Balance", value: "Off-balance", status: "critical", feedback: "You're significantly off-balance — hips are not stable over your feet. This makes it very hard to play straight.", tip: "Reset your stance. " + PRO_RANGES.headOffset.label, deduction: ded });
  }

  // 5. Shoulder Alignment (side-on vs chest-on)
  const shoulderDiff = Math.abs(landmarks[LEFT_SHOULDER].y - landmarks[RIGHT_SHOULDER].y);

  if (shoulderDiff < 0.03) {
    metrics.push({ name: "Shoulder Position", value: "Side-on", status: "good", feedback: "Shoulders nicely aligned — good side-on position facing the bowler.", tip: PRO_RANGES.shoulderDiff.label, deduction: 0 });
  } else if (shoulderDiff < 0.06) {
    const ded = 8;
    totalDeduction += ded;
    metrics.push({ name: "Shoulder Position", value: "Slight open", status: "warning", feedback: "Your front shoulder is dropping a bit. This opens up your stance and can cause you to play across the line.", tip: "Point your front shoulder towards the bowler. Think 'show the bowler your side'.", deduction: ded });
  } else {
    const ded = 15;
    totalDeduction += ded;
    metrics.push({ name: "Shoulder Position", value: "Too open", status: "critical", feedback: "Your chest is facing the bowler too much. This is a chest-on stance — you'll struggle to play straight drives.", tip: "Rotate your upper body so your front shoulder leads. " + PRO_RANGES.shoulderDiff.label, deduction: ded });
  }

  // 6. Foot Spacing
  const footDist = distance(landmarks[LEFT_ANKLE], landmarks[RIGHT_ANKLE]);
  const shoulderDist = distance(landmarks[LEFT_SHOULDER], landmarks[RIGHT_SHOULDER]);
  const footToShoulder = footDist / (shoulderDist || 0.001);

  if (footToShoulder >= 0.8 && footToShoulder <= 1.5) {
    metrics.push({ name: "Foot Spacing", value: "Good width", status: "good", feedback: "Your feet are shoulder-width apart — a stable base that allows quick movement in any direction.", tip: "Perfect spacing. Sachin kept his feet just outside shoulder width for stability.", deduction: 0 });
  } else if (footToShoulder < 0.8) {
    const ded = 10;
    totalDeduction += ded;
    metrics.push({ name: "Foot Spacing", value: "Too narrow", status: "warning", feedback: "Your feet are too close together. You'll lose balance easily, especially against pace.", tip: "Widen your base to roughly shoulder-width. You need room to transfer weight.", deduction: ded });
  } else {
    const ded = 12;
    totalDeduction += ded;
    metrics.push({ name: "Foot Spacing", value: "Too wide", status: "critical", feedback: "Your stance is too wide. You'll struggle to move your feet quickly to the ball.", tip: "Bring your feet closer — about shoulder-width. Too wide = slow feet.", deduction: ded });
  }

  const score = Math.max(0, Math.min(100, 100 - totalDeduction));

  // Pro comparison summary
  let proComparison: string;
  if (score >= 85) {
    proComparison = "Your stance mirrors the fundamentals of Sachin Tendulkar — balanced, compact, and ready. Keep it up!";
  } else if (score >= 70) {
    proComparison = "Good foundation. Virat Kohli's secret is his still head and level eyes — focus on those areas to go from good to great.";
  } else if (score >= 50) {
    proComparison = "You've got the basics. Study Rahul Dravid's stance — perfectly still head, level eyes, weight on the balls of his feet. That's your target.";
  } else {
    proComparison = "Start with the basics: watch how Sachin sets up — bent knees, still head, eyes level, bat raised. Build from there one metric at a time.";
  }

  let summary: string;
  if (score >= 85) summary = "Excellent stance! You're match-ready with only minor adjustments needed.";
  else if (score >= 70) summary = "Good base. Fix the highlighted areas and you'll see immediate improvement at the crease.";
  else if (score >= 50) summary = "Decent start. Focus on the red/orange items during practice — especially head position.";
  else summary = "Needs work. Prioritize: 1) Head & eyes level, 2) Knee bend, 3) Balance. One at a time.";

  return { score, metrics, summary, proComparison };
}

// Skeleton connections for drawing — grouped by body region for colored rendering
export const POSE_CONNECTIONS: [number, number][] = [
  // Torso
  [LEFT_SHOULDER, RIGHT_SHOULDER],
  [LEFT_SHOULDER, LEFT_HIP],
  [RIGHT_SHOULDER, RIGHT_HIP],
  [LEFT_HIP, RIGHT_HIP],
  // Left arm
  [LEFT_SHOULDER, LEFT_ELBOW],
  [LEFT_ELBOW, LEFT_WRIST],
  // Right arm
  [RIGHT_SHOULDER, RIGHT_ELBOW],
  [RIGHT_ELBOW, RIGHT_WRIST],
  // Left leg
  [LEFT_HIP, LEFT_KNEE],
  [LEFT_KNEE, LEFT_ANKLE],
  // Right leg
  [RIGHT_HIP, RIGHT_KNEE],
  [RIGHT_KNEE, RIGHT_ANKLE],
];

// Connection groups for color coding
export const CONNECTION_GROUPS: { connections: [number, number][]; color: string; label: string }[] = [
  { connections: [[LEFT_SHOULDER, RIGHT_SHOULDER], [LEFT_SHOULDER, LEFT_HIP], [RIGHT_SHOULDER, RIGHT_HIP], [LEFT_HIP, RIGHT_HIP]], color: "#00d4ff", label: "Torso" },
  { connections: [[LEFT_SHOULDER, LEFT_ELBOW], [LEFT_ELBOW, LEFT_WRIST]], color: "#8b5cf6", label: "Left Arm" },
  { connections: [[RIGHT_SHOULDER, RIGHT_ELBOW], [RIGHT_ELBOW, RIGHT_WRIST]], color: "#8b5cf6", label: "Right Arm" },
  { connections: [[LEFT_HIP, LEFT_KNEE], [LEFT_KNEE, LEFT_ANKLE]], color: "#22c55e", label: "Left Leg" },
  { connections: [[RIGHT_HIP, RIGHT_KNEE], [RIGHT_KNEE, RIGHT_ANKLE]], color: "#22c55e", label: "Right Leg" },
];

// Key joint indices for highlighted rendering
export const KEY_JOINTS = [
  { index: NOSE, label: "Head", color: "#ff2a4b" },
  { index: LEFT_SHOULDER, label: "L.Shldr", color: "#00d4ff" },
  { index: RIGHT_SHOULDER, label: "R.Shldr", color: "#00d4ff" },
  { index: LEFT_ELBOW, label: "L.Elbow", color: "#8b5cf6" },
  { index: RIGHT_ELBOW, label: "R.Elbow", color: "#8b5cf6" },
  { index: LEFT_WRIST, label: "L.Wrist", color: "#8b5cf6" },
  { index: RIGHT_WRIST, label: "R.Wrist", color: "#8b5cf6" },
  { index: LEFT_HIP, label: "L.Hip", color: "#00d4ff" },
  { index: RIGHT_HIP, label: "R.Hip", color: "#00d4ff" },
  { index: LEFT_KNEE, label: "L.Knee", color: "#22c55e" },
  { index: RIGHT_KNEE, label: "R.Knee", color: "#22c55e" },
  { index: LEFT_ANKLE, label: "L.Ankle", color: "#22c55e" },
  { index: RIGHT_ANKLE, label: "R.Ankle", color: "#22c55e" },
  { index: LEFT_EYE, label: "L.Eye", color: "#f59e0b" },
  { index: RIGHT_EYE, label: "R.Eye", color: "#f59e0b" },
];
