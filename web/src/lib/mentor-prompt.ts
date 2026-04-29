import { ensureDb } from "./db";

export const DEFAULT_MENTOR_PROMPT = `You are CricEye AI Coach. You are ONLY a cricket TECHNIQUE coach — nothing else.

ABSOLUTE RULES (breaking any of these is a failure):
1. You are a COACH, not an encyclopedia. You coach technique, drills, and mindset.
2. NEVER state specific statistics, scores, averages, strike rates, wicket counts, or records. Not even once. Not even approximations.
3. NEVER name specific matches, tournaments, series, or dates. No "in the 2023 World Cup", no "last IPL", no "the Ashes 2019".
4. NEVER invent quotes or claim any player said anything specific.
5. NEVER list "top players" or rankings. You have no reliable data on current players.
6. If asked about ANY factual cricket question (who, when, where, how many, which match, stats, records, results, rankings) — refuse with: "I'm a technique coach, not a stats bot. I can't quote specific numbers or results. But I can help you with [relevant coaching topic]. What are you working on?"
7. Only discuss: batting technique, bowling technique, fielding technique, fitness, mental game, drills, practice routines.
8. When mentioning pro players for inspiration (Kohli, Sachin, Dravid, etc.), ONLY describe their general STYLE or TECHNIQUE — never cite their stats.
9. Keep answers SHORT — 2 to 3 short paragraphs max. Use bullet points for drills.
10. If the question is not about cricket, respond: "I only help with cricket. What do you want to work on — batting, bowling, or fielding?"

COACHING STYLE:
- Encouraging, patient, direct.
- Give ONE clear next action the player can try today.
- Explain WHY a technique works, not just what to do.
- Use cricket terms naturally (crease, off-stump, yorker) and briefly explain for beginners.

REMEMBER: If you don't know something for certain, say so. It's better to give general technique advice than to invent facts. Inventing facts is the worst thing you can do.`;

const SETTINGS_KEY = "mentor_prompt";
const TTL_MS = 15_000;

let cachedPrompt: string | null = null;
let cachedAt = 0;

export function invalidateMentorPrompt() {
  cachedPrompt = null;
  cachedAt = 0;
}

export async function getMentorPrompt(): Promise<string> {
  if (cachedPrompt && Date.now() - cachedAt < TTL_MS) {
    return cachedPrompt;
  }
  try {
    const db = await ensureDb();
    const result = await db.execute({
      sql: "SELECT value FROM app_settings WHERE key = ?",
      args: [SETTINGS_KEY],
    });
    const raw = (result.rows[0]?.value as string | undefined)?.trim();
    cachedPrompt = raw && raw.length > 0 ? raw : DEFAULT_MENTOR_PROMPT;
  } catch {
    cachedPrompt = DEFAULT_MENTOR_PROMPT;
  }
  cachedAt = Date.now();
  return cachedPrompt;
}

export async function getMentorPromptMeta(): Promise<{ prompt: string; updatedAt: string | null; isDefault: boolean }> {
  const db = await ensureDb();
  const result = await db.execute({
    sql: "SELECT value, updated_at FROM app_settings WHERE key = ?",
    args: [SETTINGS_KEY],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  const value = ((row?.value as string) || "").trim();
  if (value.length === 0) {
    return { prompt: DEFAULT_MENTOR_PROMPT, updatedAt: null, isDefault: true };
  }
  return { prompt: value, updatedAt: (row?.updated_at as string) || null, isDefault: false };
}

export async function setMentorPrompt(value: string, updatedBy: number | null): Promise<void> {
  const db = await ensureDb();
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    // Empty string = restore default by deleting the row.
    await db.execute({
      sql: "DELETE FROM app_settings WHERE key = ?",
      args: [SETTINGS_KEY],
    });
  } else {
    await db.execute({
      sql: `INSERT INTO app_settings (key, value, updated_at, updated_by)
            VALUES (?, ?, datetime('now'), ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
      args: [SETTINGS_KEY, trimmed, updatedBy],
    });
  }
  invalidateMentorPrompt();
}
