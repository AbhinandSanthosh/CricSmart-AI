import { NextRequest, NextResponse } from "next/server";
import { verifyToken, isAdmin } from "@/lib/auth";
import { ensureDb } from "@/lib/db";
import { getMentorPromptMeta, setMentorPrompt, DEFAULT_MENTOR_PROMPT } from "@/lib/mentor-prompt";

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

export async function GET(req: NextRequest) {
  const guard = await requireAdminActor(req);
  if (guard instanceof NextResponse) return guard;
  const meta = await getMentorPromptMeta();
  return NextResponse.json({
    prompt: meta.prompt,
    updated_at: meta.updatedAt,
    is_default: meta.isDefault,
    default_prompt: DEFAULT_MENTOR_PROMPT,
  });
}

export async function PUT(req: NextRequest) {
  const guard = await requireAdminActor(req);
  if (guard instanceof NextResponse) return guard;
  const body = await req.json().catch(() => ({}));
  const value = typeof body.prompt === "string" ? body.prompt : "";
  await setMentorPrompt(value, guard.actorId);
  return NextResponse.json({ ok: true });
}
