import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const db = await ensureDb();
  const result = await db.execute({
    sql: "SELECT password FROM users WHERE id = ?",
    args: [user.id],
  });
  const dbUser = result.rows[0] as unknown as { password: string };

  if (!bcrypt.compareSync(currentPassword, dbUser.password)) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  await db.execute({
    sql: "UPDATE users SET password = ? WHERE id = ?",
    args: [hash, user.id],
  });

  return NextResponse.json({ ok: true });
}
