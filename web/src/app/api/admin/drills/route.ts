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
  const result = await db.execute(
    "SELECT id, role, category, category_icon, name, duration, description, steps, video_url, sort_order, is_active, created_at, updated_at FROM drills ORDER BY role, category, sort_order, id"
  );
  return NextResponse.json({ drills: result.rows });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const role = String(body.role || "").trim();
  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim();
  if (!role || !name || !category) {
    return NextResponse.json({ error: "role, category and name required" }, { status: 400 });
  }

  const stepsArr: string[] = Array.isArray(body.steps)
    ? body.steps.map((s: unknown) => String(s)).filter((s: string) => s.length > 0)
    : [];

  const db = await ensureDb();
  try {
    const result = await db.execute({
      sql: `INSERT INTO drills (role, category, category_icon, name, duration, description, steps, video_url, sort_order, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        role,
        category,
        String(body.category_icon || "Target"),
        name,
        String(body.duration || ""),
        String(body.description || ""),
        JSON.stringify(stepsArr),
        String(body.video_url || ""),
        Number(body.sort_order) || 0,
        body.is_active === false ? 0 : 1,
      ],
    });
    return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Insert failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
