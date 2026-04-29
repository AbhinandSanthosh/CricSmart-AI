import { NextRequest, NextResponse } from "next/server";
import { verifyToken, isAdmin } from "@/lib/auth";
import { ensureDb } from "@/lib/db";
import { setUserAdmin, setUserDeactivated, deleteUserCascade, AdminActionError } from "@/lib/admin-actions";

async function requireAdminActor(req: NextRequest): Promise<{ actorId: number } | NextResponse> {
  const decoded = await verifyToken(req.headers.get("authorization"));
  if (!decoded) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = await isAdmin(decoded.uid);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const db = await ensureDb();
  const r = await db.execute({ sql: "SELECT id FROM users WHERE uid = ?", args: [decoded.uid] });
  if (r.rows.length === 0) return NextResponse.json({ error: "Actor not found" }, { status: 403 });
  return { actorId: r.rows[0].id as number };
}

function handleError(e: unknown) {
  if (e instanceof AdminActionError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error("[admin/users]", e);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminActor(req);
  if (guard instanceof NextResponse) return guard;

  const { id } = await ctx.params;
  const targetId = Number(id);
  if (!Number.isFinite(targetId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));

  try {
    if (typeof body.is_admin === "boolean") {
      await setUserAdmin(targetId, body.is_admin, guard.actorId);
    }
    if (typeof body.deactivated === "boolean") {
      await setUserDeactivated(targetId, body.deactivated, guard.actorId);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminActor(req);
  if (guard instanceof NextResponse) return guard;

  const { id } = await ctx.params;
  const targetId = Number(id);
  if (!Number.isFinite(targetId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  try {
    await deleteUserCascade(targetId, guard.actorId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
