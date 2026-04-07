// Anti-hallucination guardrails for CricEye AI Coach.
//
// Two layers of defence:
//
//   1. classifyQuery(): a pre-LLM filter. Questions that *demand* factual answers
//      (stats, records, match results, rankings, player comparisons) are the
//      primary source of hallucination. We refuse to send them to the model at
//      all and return a safe redirect instead.
//
//   2. sanitizeReply(): a post-LLM filter. Even with a strict system prompt,
//      free models will occasionally hallucinate specific stats, dates, or
//      match results. We strip any sentence that looks fact-shaped before
//      showing the reply to the user.

export const SAFE_REDIRECT =
  "I'm a technique coach — I don't track stats, records, or match results (they change all the time and I can't quote them reliably). But I can absolutely help with your technique. What are you working on — batting, bowling, fielding, or the mental game?";

export interface Classification {
  blocked: boolean;
  reply: string;
}

// Patterns that identify fact-seeking queries (not coaching questions).
// Each regex has been chosen to catch a *class* of question without being
// overly broad — "how do I play the pull shot" must still reach the LLM.
const FACT_SEEKING_PATTERNS: RegExp[] = [
  // Questions starting with interrogatives that demand a fact
  /\b(who|when|where|which)\s+(is|was|are|were|did|has|have|won|scored|hit|took|holds?)\b/i,
  /\bhow\s+(many|much)\b/i,

  // Stats / records / rankings
  /\b(stat|stats|statistics|average|strike\s*rate|economy|record|records|ranking|ranked|top\s*\d+|best\s*ever|greatest\s*of\s*all)\b/i,
  /\b(most|highest|lowest|fastest|slowest)\s+(run|runs|wicket|wickets|score|century|centuries|six|sixes|four|fours)/i,

  // Match results / scores
  /\b(score|result|won|winner|winning\s+team|man\s+of\s+the\s+match)\b.*\b(match|game|series|final|cup|trophy)\b/i,
  /\b(match|game|series|final|cup|trophy)\b.*\b(score|result|won|winner)\b/i,
  /\bwhat\s+was\s+the\s+(score|result|total)\b/i,

  // Tournaments by name (these almost always precede a stat question)
  /\b(ipl|world\s*cup|t20\s*world\s*cup|odi\s*world\s*cup|ashes|bbl|cpl|psl|asia\s*cup|champions\s*trophy|wpl|wbbl)\b.*\b(who|when|what|score|result|won|winner|stat|average|most|highest|top|best|final)\b/i,
  /\b(who|when|what|score|result|won|winner|stat|average|most|highest|top|best|final)\b.*\b(ipl|world\s*cup|t20\s*world\s*cup|odi\s*world\s*cup|ashes|bbl|cpl|psl|asia\s*cup|champions\s*trophy|wpl|wbbl)\b/i,

  // Year references (asking about a specific past event)
  /\b(in|during|since)\s+(19|20)\d{2}\b/i,
  /\b(19|20)\d{2}\s+(season|series|final|cup|tour|match|game)\b/i,

  // Player comparisons / "who is better"
  /\bwho\s+is\s+(better|best|greatest|the\s+goat)\b/i,
  /\b(vs|versus)\b.*\b(who\s+wins|better|stat)\b/i,

  // Rankings and lists
  /\b(top|list)\s+\d+\s+(player|batsman|bowler|all-?rounder|wicket-?keeper)/i,
  /\bbest\s+(batsman|bowler|all-?rounder|wicket-?keeper|fielder|captain|coach)\s+(in|of)\b/i,

  // Current / recent news
  /\b(current|recent|latest|today|yesterday|this\s+week|this\s+month|this\s+year)\b.*\b(match|series|score|result|news|ranking)\b/i,
];

// If the question trips one of these, it's clearly about coaching — whitelist
// it even if it contains a suspicious keyword.
const COACHING_ALLOWLIST: RegExp[] = [
  /\bhow\s+(do\s+i|to|can\s+i|should\s+i)\b.*\b(play|face|bowl|bat|hit|hold|grip|stand|stance|practi[sc]e|train|improve|defend|attack)\b/i,
  /\b(technique|drill|practice|practise|footwork|grip|stance|backlift|follow\s*through|wrist|release|run-?up|action)\b/i,
  /\b(tips?|help|advice|coaching|guide)\b.*\b(bat|bowl|field|catch|throw|shot|swing|spin|pace)\b/i,
];

export function classifyQuery(message: string): Classification {
  const m = message.trim();
  if (!m) return { blocked: true, reply: SAFE_REDIRECT };

  // If it's clearly a coaching question, let it through even if it trips
  // a fact-seeking pattern (e.g. "how to bowl a yorker like Bumrah").
  const looksLikeCoaching = COACHING_ALLOWLIST.some((rx) => rx.test(m));
  if (looksLikeCoaching) return { blocked: false, reply: "" };

  const isFactSeeking = FACT_SEEKING_PATTERNS.some((rx) => rx.test(m));
  if (isFactSeeking) return { blocked: true, reply: SAFE_REDIRECT };

  return { blocked: false, reply: "" };
}

// Strip sentences that look like fabricated facts. This runs AFTER the model
// replies, as a safety net. It's intentionally aggressive — better to lose a
// true-but-unverified sentence than to show the user an invented stat.
const FACT_SENTENCE_PATTERNS: RegExp[] = [
  // Specific numeric cricket stats: "scored 45 runs", "took 3 wickets", "average of 53"
  /\b(scored|hit|struck|smashed|made)\s+\d[\d,]*\s+(run|runs|six|sixes|four|fours|century|centuries|fifty|fifties)\b/i,
  /\b(took|claimed|grabbed|bagged)\s+\d[\d,]*\s+(wicket|wickets)\b/i,
  /\baverage(?:s|d)?\s+(?:of\s+)?\d+(?:\.\d+)?\b/i,
  /\bstrike\s*rate\s+(?:of\s+)?\d+(?:\.\d+)?\b/i,
  /\beconomy\s+(?:rate\s+)?(?:of\s+)?\d+(?:\.\d+)?\b/i,

  // Match results with scores: "won by 5 wickets", "beat them by 34 runs"
  /\b(won|beat|defeated|lost)\s+(by|to)\s+\d+\s+(run|runs|wicket|wickets)\b/i,

  // Tournament-year references: "at the 2019 World Cup", "IPL 2023"
  /\b(ipl|world\s*cup|t20\s*world\s*cup|odi\s*world\s*cup|ashes|bbl|cpl|psl|asia\s*cup|champions\s*trophy|wpl|wbbl)\s*(19|20)\d{2}\b/i,
  /\b(19|20)\d{2}\s+(ipl|world\s*cup|t20\s*world\s*cup|odi\s*world\s*cup|ashes|bbl|cpl|psl|asia\s*cup|champions\s*trophy|wpl|wbbl)\b/i,
  /\b(in|at|during)\s+the\s+(19|20)\d{2}\s+(world\s*cup|ipl|ashes|series|final|tour|season)\b/i,

  // "X is the best/greatest" style rankings
  /\b(is|was)\s+(the\s+)?(best|greatest|top|#1|number\s*one|goat)\s+(batsman|bowler|all-?rounder|player|cricketer|captain)\b/i,

  // Made-up quotes
  /\b(said|once\s+said|famously\s+said|told|mentioned)\s*[,:]/i,

  // Awards and honors (these are always tied to specific tournaments/seasons)
  /\b(won|received|got)\s+(the\s+)?(orange|purple)\s*cap\b/i,
  /\b(won|received|got)\s+(the\s+)?(man|player)\s+of\s+the\s+(match|series|tournament)\b/i,
  /\b(won|received|named)\s+(the\s+)?(icc|espn)\s+(cricketer|player)\s+of\s+the\s+year\b/i,

  // Orphan references to past seasons/tournaments ("that season", "in that match")
  /\b(that|the)\s+(season|tournament|series|final|match|game|year|edition)\b.*\b(won|scored|took|hit|claimed|beat|defeated)\b/i,
  /\b(won|scored|took|hit|claimed|beat|defeated)\b.*\b(that|the)\s+(season|tournament|series|final|match|game|year|edition)\b/i,
];

export interface SanitizedReply {
  cleaned: string;
  wasSanitized: boolean;
}

export function sanitizeReply(raw: string): SanitizedReply {
  if (!raw || typeof raw !== "string") return { cleaned: "", wasSanitized: false };

  const originalLen = raw.trim().length;

  // Split into sentences while preserving line breaks (for bullet lists).
  // We treat each line + each sentence within a line as a unit.
  const lines = raw.split(/(\r?\n)/);
  let modified = false;
  const out: string[] = [];

  for (const line of lines) {
    if (/^\r?\n$/.test(line)) {
      out.push(line);
      continue;
    }
    // Split on sentence boundaries but keep the punctuation
    const sentences = line.split(/(?<=[.!?])\s+/);
    const kept = sentences.filter((s) => {
      const trimmed = s.trim();
      if (!trimmed) return false;
      const isFabricated = FACT_SENTENCE_PATTERNS.some((rx) => rx.test(trimmed));
      if (isFabricated) {
        modified = true;
        return false;
      }
      return true;
    });
    out.push(kept.join(" "));
  }

  let cleaned = out.join("").trim();

  // Collapse excess whitespace left behind after stripping
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").replace(/ {2,}/g, " ").trim();

  // Guards that discard the reply entirely (forcing a fallback):
  //
  //   1. Too short to be useful (< 50 chars).
  //   2. More than 40% of the original content was stripped — the model was
  //      clearly trying to make things up, so the remaining fragments are
  //      untrustworthy context-free sentences.
  if (cleaned.length < 50) return { cleaned: "", wasSanitized: true };
  const keptRatio = cleaned.length / Math.max(1, originalLen);
  if (modified && keptRatio < 0.6) return { cleaned: "", wasSanitized: true };

  return { cleaned, wasSanitized: modified };
}
