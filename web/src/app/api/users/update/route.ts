import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { email, phone } = await req.json();
  const db = getDb();
  db.prepare("UPDATE users SET email = ?, phone = ? WHERE id = ?").run(
    email || "",
    phone || "",
    user.id
  );

  return NextResponse.json({ ok: true });
}
