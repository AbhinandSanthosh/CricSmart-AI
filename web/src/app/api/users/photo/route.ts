import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureDb } from "@/lib/db";

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { photo } = await req.json();
  if (!photo) {
    return NextResponse.json({ error: "Photo data required" }, { status: 400 });
  }

  // Limit base64 size to ~2MB
  if (photo.length > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (max 2MB)" }, { status: 400 });
  }

  const db = await ensureDb();
  await db.execute({
    sql: "UPDATE users SET profile_photo = ? WHERE id = ?",
    args: [photo, user.id],
  });

  return NextResponse.json({ ok: true, profile_photo: photo });
}
