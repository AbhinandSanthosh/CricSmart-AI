import { NextRequest, NextResponse } from "next/server";
import { verifyToken, isAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const decodedToken = await verifyToken(req.headers.get("authorization"));
  if (!decodedToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = await isAdmin(decodedToken.uid);
  return NextResponse.json({ isAdmin: admin });
}
