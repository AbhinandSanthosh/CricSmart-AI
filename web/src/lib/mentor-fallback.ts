// Rule-based cricket mentor fallback (ported from prompt.py)

export function fallbackMentor(prompt: string): string {
  const p = prompt.toLowerCase();

  // DEALING WITH LOSS
  if (["lost", "loss", "defeat", "we lost", "match lost", "losing", "disappointed"].some((w) => p.includes(w))) {
    return `**Dealing with a tough loss:**

First, give yourself and your team credit for the effort. Every match teaches something.

1. **Reflect, don't dwell**: Think about one thing you did well and one thing you can improve.
2. **Team talk**: Share what you learned with teammates. A loss can strengthen bonds.
3. **Reset mentally**: Tomorrow is a new day. Leave the result on the field and focus on your next session.

**Cricket wisdom**: Even the greatest players have lost matches. What matters is how you respond. Use this as fuel to train harder and smarter.

You've got this. One practice at a time.`;
  }

  // BOWLING
  const bowlingCues = ["how to bowl", "bowling tips", "bowl a", "bowl the", "bowling action", "bowling variations"];
  const isBowling = bowlingCues.some((c) => p.includes(c)) || ((p.includes("bowl") || p.includes("bowling")) && !p.includes("face") && !p.includes("play"));

  if (isBowling) {
    if (p.includes("inswing")) return `**How to bowl inswing:**\n\n1. **Grip**: Hold the seam upright with the shiny side on the leg side.\n2. **Release**: Wrist slightly turned towards the slips. Seam points towards leg side.\n3. **Action**: Arm upright, follow through towards the batsman.\n\n**Drill**: Practice with a semi-new ball on a good length.`;
    if (p.includes("outswing")) return `**How to bowl outswing:**\n\n1. **Grip**: Seam upright, shiny side on the off side.\n2. **Release**: Wrist rotated towards the slips. Seam points to first slip.\n3. **Action**: Arm high, follow through towards the slips.\n\n**Drill**: Place a marker on good length and aim to curve the ball away.`;
    if (p.includes("bouncer") || p.includes("short ball")) return `**How to bowl a bouncer:**\n\n1. **Grip**: Normal seam grip.\n2. **Length**: Aim halfway down the pitch.\n3. **Action**: Quicker arm with more shoulder rotation.\n\n**Safety**: Use bouncers sparingly and with control.`;
    if (p.includes("yorker") || p.includes("full ball")) return `**How to bowl a yorker:**\n\n1. **Grip**: Normal seam grip, slightly lower wrist.\n2. **Length**: Aim at the batsman's toes, right at the crease line.\n3. **Action**: Release later in delivery stride, wrist straight.\n\n**Drill**: Place a shoe at the batsman's feet and hit it repeatedly.`;
    if (p.includes("slower ball") || p.includes("slow ball")) return `**How to bowl a slower ball:**\n\nTypes:\n1. **Off-cutter**: Roll fingers over the seam\n2. **Leg-cutter**: Wrist flick like leg-spin\n3. **Back-of-hand**: Ball released from back of hand\n4. **Split-finger**: Index and middle fingers spread apart\n\n**Tip**: Vary pace without changing your action.`;
    if (p.includes("spin") || p.includes("leg-spin") || p.includes("off-spin") || p.includes("googly")) {
      if (p.includes("leg-spin") || p.includes("googly")) return `**Leg-spin / Googly:**\n\n**Leg-spin**: Ball rests between first two fingers and thumb. Wrist turns right to left (RHB). Ball spins leg to off.\n\n**Googly**: Same grip, wrist turns opposite way. Back of hand faces batsman at delivery.\n\n**Drill**: Bowl at a target, focus on consistency before drift and turn.`;
      return `**Off-spin bowling:**\n\n1. **Grip**: First two fingers spread across seam, thumb underneath.\n2. **Release**: Roll fingers over the ball. Index finger imparts spin.\n3. **Action**: Arm high, pivot on front foot, hip rotation.\n\n**Drill**: Bowl at a spot, consistent length first, then add flight.`;
    }
    return `To give you the best bowling advice, please specify:\n- Inswing / Outswing\n- Bouncer, Yorker, or Slower ball\n- Spin (leg-spin, off-spin, googly)\n\nI'll give you step-by-step technique and drills.`;
  }

  // BATTING
  const battingCues = ["how to face", "facing", "play against", "bat against", "shot to play", "best shot"];
  const isBatting = battingCues.some((c) => p.includes(c)) || ((p.includes("bat") || p.includes("batting")) && !p.includes("bowl"));

  if (isBatting) {
    if (p.includes("inswing")) return `**Facing inswing:**\n\n1. **Watch the seam** at release\n2. **Footwork**: Front foot across to the line\n3. **Bat angle**: Straight, close to pad\n4. **Best shots**: Defensive block, on-drive, clip off pads\n\n**Mindset**: Trust your judgment. Don't commit until you've picked the line.`;
    if (p.includes("outswing")) return `**Facing outswing:**\n\n1. **Watch the seam** angle\n2. **Footwork**: Stay beside the line, don't chase\n3. **Leave**: If outside off and moving away, leave it\n4. **Best shots**: Defensive block, cover drive, late cut\n\n**Drill**: Practice leaving and playing late.`;
    if (p.includes("bouncer") || p.includes("short ball")) return `**Playing the bouncer:**\n\n1. **Recognise early**: Watch wrist position and length\n2. **Footwork**: Move back and across\n3. **Best shots**: Pull (chest-high), Hook (head-high), Duck/leave (too high)\n\n**Safety**: Always wear a helmet against short-pitched bowling.`;
    if (p.includes("yorker") || p.includes("full ball")) return `**Playing the yorker:**\n\n1. **Watch early**: Pick the length ASAP\n2. **Footwork**: Front foot to pitch of ball\n3. **Best shots**: Block (good yorker), Drive (full toss), Scoop/ramp (advanced)\n\n**Drill**: Practice with throwdowns from short distance.`;
    if (p.includes("spin") || p.includes("googly")) {
      if (p.includes("googly")) return `**Facing a googly:**\n\nA googly turns opposite to normal leg-spin.\n\n1. **Watch the hand**: Back of hand faces you at release\n2. **Play late**: Wait for pitch and turn\n3. **Best shots**: Forward defence, straight drive, controlled sweep\n\n**Drill**: Practice against a spinner who bowls both leg-spin and googly.`;
      return `**Playing spin bowling:**\n\n1. **Read the bowler**: Watch wrist and fingers\n2. **Use your feet**: Get to the pitch or stay back\n3. **Soft hands**: Avoid catching chances\n4. **Best shots**: Sweep, drive, defence\n\n**Mindset**: Patience is key. Wait for the loose ball.`;
    }
    return `To help you face that delivery, tell me which one:\n- Inswing / Outswing\n- Bouncer / Short ball\n- Yorker / Full ball\n- Slower ball\n- Spin (googly, leg-spin, off-spin)\n\nI'll give you the best technique and shot options.`;
  }

  // FIELDING
  if (["fielding", "field", "catch", "throwing", "diving"].some((w) => p.includes(w))) {
    return `**Fielding tips:**\n\n1. **Catching**: Eyes on ball until it settles. Soft hands.\n2. **Ground fielding**: Get low, straight back, long barrier.\n3. **Throwing**: Work on release point and accuracy. Practice at single stump.\n4. **Diving**: Practice on soft ground, land on your side.\n\n**Mental**: Trust your prep. Visualise taking the catch before the ball is bowled.`;
  }

  // FOCUS
  if (["focus", "concentrate", "watch the ball", "lose focus", "distracted"].some((w) => p.includes(w))) {
    return `**Improving focus:**\n\n1. **Head position**: Still and level\n2. **Ball tracking**: Pick it up from bowler's hand. Use a trigger tap.\n3. **Drills**: Close-range reaction catches\n4. **Breathing**: Deep breaths between deliveries to reset\n\n**Mental**: Concentration is a skill you build. "Next ball only."`;
  }

  // CONFIDENCE
  if (["confidence", "nervous", "scared", "pressure", "mentally"].some((w) => p.includes(w))) {
    return `**Building mental strength:**\n\n1. **Preparation**: Visualise success\n2. **Routine**: Pre-delivery tap, breath\n3. **Mistakes**: Everyone makes them. Say "next ball" and reset.\n4. **Support**: Talk to teammates and coaches\n\nYou have the skill - now trust it. One ball at a time.`;
  }

  // DEFAULT
  return `Thanks for asking about "${prompt}". I'd love to help!\n\nCould you tell me if this is about **batting**, **bowling**, or **fielding**?\n\nFor batting: facing different deliveries (swing, bouncers, yorkers, spin)\nFor bowling: how to bowl inswing, outswing, yorkers, spin variations\n\nJust let me know and we'll work on it together.`;
}
