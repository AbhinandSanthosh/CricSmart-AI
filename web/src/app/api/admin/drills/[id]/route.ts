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

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const drillId = Number(id);
  if (!Number.isFinite(drillId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const fields: string[] = [];
  const args: (string | number)[] = [];

  const stringCols = ["role", "category", "category_icon", "name", "duration", "description", "video_url"] as const;
  for (const col of stringCols) {
    if (typeof body[col] === "string") {
      fields.push(`${col} = ?`);
      args.push(body[col]);
    }
  }
  if (Array.isArray(body.steps)) {
    fields.push("steps = ?");
    args.push(JSON.stringify(body.steps.map((s: unknown) => String(s)).filter((s: string) => s.length > 0)));
  }
  if (typeof body.sort_order === "number") {
    fields.push("sort_order = ?");
    args.push(body.sort_order);
  }
  if (typeof body.is_active === "boolean") {
    fields.push("is_active = ?");
    args.push(body.is_active ? 1 : 0);
  }

  if (fields.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  fields.push("updated_at = datetime('now')");

  const db = await ensureDb();
  try {
    await db.execute({
      sql: `UPDATE drills SET ${fields.join(", ")} WHERE id = ?`,
      args: [...args, drillId],
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const drillId = Number(id);
  if (!Number.isFinite(drillId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const db = await ensureDb();
  await db.execute({ sql: "DELETE FROM drills WHERE id = ?", args: [drillId] });
  return NextResponse.json({ ok: true });
}
