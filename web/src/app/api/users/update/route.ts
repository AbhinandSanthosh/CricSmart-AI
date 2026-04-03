import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureDb } from "@/lib/db";

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { email, phone } = await req.json();
  const db = await ensureDb();
  await db.execute({
    sql: "UPDATE users SET email = ?, phone = ? WHERE id = ?",
    args: [email || "", phone || "", user.id],
  });

  return NextResponse.json({ ok: true });
}
