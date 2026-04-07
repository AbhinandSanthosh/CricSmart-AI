import { NextRequest, NextResponse } from "next/server";
import { fallbackMentor } from "@/lib/mentor-fallback";
import { classifyQuery, sanitizeReply, SAFE_REDIRECT } from "@/lib/mentor-guards";

const SYSTEM_PROMPT = `You are CricEye AI Coach. You are ONLY a cricket TECHNIQUE coach — nothing else.

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

async function callOpenRouter(
  apiKey: string,
  message: string,
  history: { role: string; content: string }[],
): Promise<string | null> {
  const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free";
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "CricEye AI Coach",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.slice(-6),
          { role: "user", content: message },
        ],
        max_tokens: 500,
        temperature: 0.2,
        top_p: 0.85,
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      await res.text();
      return null;
    }
    const data = await res.json();
    const reply: string | undefined = data.choices?.[0]?.message?.content;
    return reply?.trim() || null;
  } catch {
    return null;
  }
}

async function callOllama(
  message: string,
  history: { role: string; content: string }[],
): Promise<string | null> {
  try {
    const res = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.slice(-6),
          { role: "user", content: message },
        ],
        options: { temperature: 0.2, top_p: 0.85 },
        stream: false,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // --- Step 1: classify the query ---
    // Fact-seeking questions (stats, results, rankings, records) are intercepted
    // BEFORE they reach the LLM. These are the primary source of hallucination.
    const classification = classifyQuery(message);
    if (classification.blocked) {
      return NextResponse.json({
        reply: classification.reply,
        source: "guard",
      });
    }

    const safeHistory = Array.isArray(history) ? history : [];

    // --- Step 2: try OpenRouter (primary model) ---
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
    if (OPENROUTER_KEY) {
      const raw = await callOpenRouter(OPENROUTER_KEY, message, safeHistory);
      if (raw) {
        const { cleaned, wasSanitized } = sanitizeReply(raw);
        if (cleaned) {
          return NextResponse.json({
            reply: cleaned,
            source: wasSanitized ? "openrouter_sanitized" : "openrouter",
          });
        }
        // Response was fully stripped by sanitizer → unsafe, fall through
      }
    }

    // --- Step 3: try Ollama (local development) ---
    const ollamaRaw = await callOllama(message, safeHistory);
    if (ollamaRaw) {
      const { cleaned, wasSanitized } = sanitizeReply(ollamaRaw);
      if (cleaned) {
        return NextResponse.json({
          reply: cleaned,
          source: wasSanitized ? "ollama_sanitized" : "ollama",
        });
      }
    }

    // --- Step 4: rule-based fallback ---
    // If we get here, either no LLM was reachable or the response was unsafe.
    // The rule-based fallback is deterministic and cannot hallucinate.
    const reply = fallbackMentor(message) || SAFE_REDIRECT;
    return NextResponse.json({ reply, source: "fallback" });
  } catch {
    return NextResponse.json({ error: "Mentor failed" }, { status: 500 });
  }
}
