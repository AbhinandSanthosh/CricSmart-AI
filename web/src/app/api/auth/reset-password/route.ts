import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();
    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token and new password required" }, { status: 400 });
    }
    if (newPassword.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
    }

    const db = await ensureDb();
    const reset = await db.execute({
      sql: "SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > datetime('now')",
      args: [token],
    });

    if (reset.rows.length === 0) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    const row = reset.rows[0] as unknown as { email: string };
    const hash = bcrypt.hashSync(newPassword, 10);

    await db.execute({
      sql: "UPDATE users SET password = ? WHERE email = ?",
      args: [hash, row.email],
    });

    await db.execute({
      sql: "UPDATE password_resets SET used = 1 WHERE token = ?",
      args: [token],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
