import { NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";

export async function GET() {
  const db = await ensureDb();
  const r = await db.execute(
    "SELECT id, message, variant, expires_at FROM announcements WHERE is_active = 1 ORDER BY id DESC LIMIT 1"
  );
  const row = r.rows[0] as Record<string, unknown> | undefined;
  if (!row) return NextResponse.json({ banner: null });

  const expiresAt = row.expires_at as string | null;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ banner: null });
  }

  return NextResponse.json({
    banner: {
      id: row.id as number,
      message: row.message as string,
      variant: (row.variant as string) || "info",
    },
  });
}
