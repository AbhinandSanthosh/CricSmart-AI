import { NextRequest, NextResponse } from "next/server";
import { fallbackMentor } from "@/lib/mentor-fallback";

const SYSTEM_PROMPT = `You are CricEye AI Coach, an expert cricket coach and analyst.
Your tone is encouraging, patient, and supportive. You understand that cricket is as much a mental game as a technical one.
You give concise, actionable advice on batting, bowling, fielding, fitness, and match strategy.
Use cricket terminology naturally. When a player struggles, acknowledge their effort and provide a clear path forward.
Always promote proper technique, safety, and a positive mindset.

Focus on these areas:
- Batting (stance, grip, footwork, shot selection, power hitting)
- Bowling (action, run-up, variations, accuracy)
- Fielding (catching, ground fielding, throwing, diving)
- Fitness and conditioning
- Mental aspects (focus, confidence, handling pressure, dealing with loss)
- Drills and practice routines`;

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
            model: process.env.OPENROUTER_MODEL || "liquid/lfm-2.5-1.2b-instruct:free",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...(history || []).slice(-10),
              { role: "user", content: message },
            ],
            max_tokens: 1024,
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
