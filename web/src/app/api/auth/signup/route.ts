import { NextRequest, NextResponse } from "next/server";
import { createUser, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password, role, skillLevel, bowlingStyle } = await req.json();
    if (!username || !password || !role || !skillLevel) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }
    if (password.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
    }
    const user = await createUser(username, password, role, skillLevel, bowlingStyle);
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, username: user.username, primary_role: user.primary_role, skill_level: user.skill_level } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Signup failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
