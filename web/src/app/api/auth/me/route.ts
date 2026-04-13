import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getUserByUid } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const decodedToken = await verifyToken(req.headers.get("authorization"));
  if (!decodedToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await getUserByUid(decodedToken.uid);
  if (!user) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
