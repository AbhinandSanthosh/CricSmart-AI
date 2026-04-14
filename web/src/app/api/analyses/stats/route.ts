import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getUserByUid } from "@/lib/auth";
import { getUserStats } from "@/lib/gamification";

export async function GET(req: NextRequest) {
  try {
    const decodedToken = await verifyToken(req.headers.get("authorization"));
    if (!decodedToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await getUserByUid(decodedToken.uid);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const stats = await getUserStats(user.id);
    return NextResponse.json({ stats });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to fetch stats";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
