import { NextRequest, NextResponse } from "next/server";
import { verifyToken, isAdmin } from "@/lib/auth";
import { checkServices } from "@/lib/health";

export async function GET(req: NextRequest) {
  const decoded = await verifyToken(req.headers.get("authorization"));
  if (!decoded) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = await isAdmin(decoded.uid);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const services = await checkServices();
  return NextResponse.json({ services, checked_at: new Date().toISOString() });
}
