import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }
    const user = await authenticateUser(username, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    await createSession(user.id);
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        primary_role: user.primary_role,
        skill_level: user.skill_level,
        is_admin: user.is_admin,
      },
    });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
