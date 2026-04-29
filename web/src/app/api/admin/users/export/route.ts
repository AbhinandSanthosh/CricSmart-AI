import { NextRequest, NextResponse } from "next/server";
import { verifyToken, isAdmin } from "@/lib/auth";
import { ensureDb } from "@/lib/db";
import { toCsv } from "@/lib/csv";

interface Row {
  id: number;
  username: string;
  email: string;
  primary_role: string;
  skill_level: string;
  is_admin: number;
  deactivated_at: string | null;
  created_at: string;
}

export async function GET(req: NextRequest) {
  const decoded = await verifyToken(req.headers.get("authorization"));
  if (!decoded) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = await isAdmin(decoded.uid);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const db = await ensureDb();
  const result = await db.execute(
    "SELECT id, username, email, primary_role, skill_level, is_admin, deactivated_at, created_at FROM users ORDER BY id"
  );

  const rows = result.rows as unknown as Row[];
  const csv = toCsv<Row>(rows, [
    { header: "id", get: (r) => r.id },
    { header: "username", get: (r) => r.username },
    { header: "email", get: (r) => r.email },
    { header: "role", get: (r) => r.primary_role },
    { header: "skill_level", get: (r) => r.skill_level },
    { header: "is_admin", get: (r) => (r.is_admin === 1 ? "yes" : "no") },
    { header: "deactivated_at", get: (r) => r.deactivated_at || "" },
    { header: "created_at", get: (r) => r.created_at },
  ]);

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="criceye-users-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
