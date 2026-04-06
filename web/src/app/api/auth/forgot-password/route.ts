import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const db = await ensureDb();
    const user = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email],
    });

    if (user.rows.length === 0) {
      return NextResponse.json({ error: "No account found with this email" }, { status: 404 });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    await db.execute({
      sql: "INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)",
      args: [email, token, expiresAt],
    });

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
