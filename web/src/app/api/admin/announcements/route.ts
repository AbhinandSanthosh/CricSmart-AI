import { NextRequest, NextResponse } from "next/server";
import { verifyToken, isAdmin } from "@/lib/auth";
import { ensureDb } from "@/lib/db";

async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const decoded = await verifyToken(req.headers.get("authorization"));
  if (!decoded) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = await isAdmin(decoded.uid);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  return null;
}

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const db = await ensureDb();
  const r = await db.execute("SELECT id, message, variant, is_active, expires_at, created_at, updated_at FROM announcements ORDER BY id DESC LIMIT 1");
  return NextResponse.json({ announcement: r.rows[0] || null });
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const message = String(body.message || "").trim();
  const variant = String(body.variant || "info");
  const isActive = body.is_active === true || body.is_active === 1 ? 1 : 0;
  const expiresAt = body.expires_at ? String(body.expires_at) : null;

  if (isActive && message.length === 0) {
    return NextResponse.json({ error: "Message required when active" }, { status: 400 });
  }

  const db = await ensureDb();
  const existing = await db.execute("SELECT id FROM announcements ORDER BY id DESC LIMIT 1");
  if (existing.rows.length === 0) {
    await db.execute({
      sql: "INSERT INTO announcements (message, variant, is_active, expires_at) VALUES (?, ?, ?, ?)",
      args: [message, variant, isActive, expiresAt],
    });
  } else {
    await db.execute({
      sql: "UPDATE announcements SET message = ?, variant = ?, is_active = ?, expires_at = ?, updated_at = datetime('now') WHERE id = ?",
      args: [message, variant, isActive, expiresAt, existing.rows[0].id as number],
    });
  }
  return NextResponse.json({ ok: true });
}
