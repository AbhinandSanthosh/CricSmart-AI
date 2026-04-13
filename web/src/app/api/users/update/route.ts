import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getUserByUid } from "@/lib/auth";
import { ensureDb } from "@/lib/db";

export async function PUT(req: NextRequest) {
  const decodedToken = await verifyToken(req.headers.get("authorization"));
  if (!decodedToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await getUserByUid(decodedToken.uid);
  if (!user) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  const { email, phone } = await req.json();
  const db = await ensureDb();
  await db.execute({
    sql: "UPDATE users SET email = ?, phone = ? WHERE id = ?",
    args: [email || "", phone || "", user.id],
  });

  return NextResponse.json({ ok: true });
}
