import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getUserByUid } from "@/lib/auth";
import { saveAnalysis, updateStreak, checkAndAwardBadges } from "@/lib/gamification";

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

    const { type, score, data } = await req.json();
    if (!type || score === undefined || !data) {
      return NextResponse.json({ error: "type, score, and data are required" }, { status: 400 });
    }

    const analysisId = await saveAnalysis(user.id, type, score, data);
    const streak = await updateStreak(user.id);
    const newBadges = await checkAndAwardBadges(user.id, data, streak);

    return NextResponse.json({ ok: true, analysisId, streak, newBadges });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to save analysis";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
