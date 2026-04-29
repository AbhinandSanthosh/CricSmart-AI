import { NextRequest, NextResponse } from "next/server";
import { verifyToken, isAdmin } from "@/lib/auth";
import { ensureDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const decoded = await verifyToken(req.headers.get("authorization"));
  if (!decoded) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = await isAdmin(decoded.uid);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const db = await ensureDb();
  const result = await db.execute(
    "SELECT id, uid, username, email, primary_role, skill_level, is_admin, deactivated_at, created_at FROM users ORDER BY id"
  );

  return NextResponse.json({ users: result.rows });
}
