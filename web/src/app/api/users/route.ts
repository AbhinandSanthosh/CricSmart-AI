import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureDb } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.is_admin !== 1) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const db = await ensureDb();
  const result = await db.execute(
    "SELECT id, username, primary_role, skill_level, is_admin, created_at FROM users ORDER BY id"
  );

  return NextResponse.json({ users: result.rows });
}
