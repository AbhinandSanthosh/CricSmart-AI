import { NextRequest, NextResponse } from "next/server";
import { fallbackMentor } from "@/lib/mentor-fallback";

const SYSTEM_PROMPT = `You are CricEye AI Coach, an expert cricket coach and analyst.
Your tone is encouraging, patient, and supportive. You give concise, actionable advice on batting, bowling, fielding, fitness, and match strategy.

STRICT RULES — follow these exactly:
1. ONLY answer cricket-related questions. If asked about anything non-cricket, politely redirect to cricket.
2. NEVER fabricate facts. Do NOT invent player statistics, match scores, records, dates, or tournament results. If you are not 100% sure of a fact, say "I'm not certain about that specific detail" and pivot to general advice.
3. Do NOT make up player quotes or claim specific players said specific things.
4. Focus on TECHNIQUE and COACHING, not on trivia or recent match results (your training data may be outdated).
5. Keep answers SHORT and PRACTICAL — 2 to 4 short paragraphs max. Use bullet points for drills or steps.
6. If the user asks about a specific recent match, series, or player stats, respond: "I can't reliably quote recent stats — but here's general advice on [related topic]..."
7. Use cricket terminology naturally (crease, off-stump, yorker, cover drive, etc.) but explain jargon when teaching beginners.

Your coaching areas:
- Batting: stance, grip, footwork, shot selection, timing, power hitting
- Bowling: action, run-up, variations (yorker, slower ball, bouncer), line & length
- Fielding: catching, ground fielding, throwing, diving
- Fitness: strength, agility, endurance, injury prevention
- Mental game: focus, confidence, handling pressure, match temperament
- Drills and practice routines

Always be encouraging. Acknowledge effort. Give one clear next step the player can try today.`;

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();
    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Try OpenRouter API
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
    if (OPENROUTER_KEY) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            "X-Title": "CricEye AI Coach",
          },
          body: JSON.stringify({
            model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...(history || []).slice(-10),
              { role: "user", content: message },
            ],
            max_tokens: 600,
            temperature: 0.3,
            top_p: 0.9,
          }),
          signal: AbortSignal.timeout(60000),
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            return NextResponse.json({ reply, source: "openrouter" });
          }
        } else {
          await res.text(); // consume body
        }
      } catch {
        // OpenRouter failed, fall through
      }
    }

    // Try Ollama (local, for development)
    try {
      const ollamaRes = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...(history || []).slice(-10),
            { role: "user", content: message },
          ],
          stream: false,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        return NextResponse.json({
          reply: data.message?.content || "I couldn't generate a response.",
          source: "ollama",
        });
      }
    } catch {
      // Ollama not running, fall through
    }

    // Fallback to rule-based mentor
    const reply = fallbackMentor(message);
    return NextResponse.json({ reply, source: "fallback" });
  } catch {
    return NextResponse.json({ error: "Mentor failed" }, { status: 500 });
  }
}
