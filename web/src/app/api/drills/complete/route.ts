import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getUserByUid } from "@/lib/auth";
import { completeDrill, updateStreak } from "@/lib/gamification";

export async function POST(req: NextRequest) {
  try {
    const decodedToken = await verifyToken(req.headers.get("authorization"));
    if (!decodedToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await getUserByUid(decodedToken.uid);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { drillName, category } = await req.json();
    if (!drillName) {
      return NextResponse.json({ error: "drillName is required" }, { status: 400 });
    }

    const id = await completeDrill(user.id, drillName, category || "");
    // Drill completion also contributes to practice streak
    const streak = await updateStreak(user.id);

    return NextResponse.json({ ok: true, id, streak });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to log drill";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
