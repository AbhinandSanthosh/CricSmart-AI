import { NextRequest, NextResponse } from "next/server";
import { fallbackMentor } from "@/lib/mentor-fallback";

const SYSTEM_PROMPT = `You are CricSmart AI Coach, an expert cricket coach and analyst.
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

    // Try Ollama first (free, local)
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
