import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { ensureDb } from "@/lib/db";

export interface DrillDto {
  id: number;
  role: string;
  category: string;
  category_icon: string;
  name: string;
  duration: string;
  description: string;
  steps: string[];
  video_url: string;
  sort_order: number;
}

export async function GET(req: NextRequest) {
  const decoded = await verifyToken(req.headers.get("authorization"));
  if (!decoded) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const role = url.searchParams.get("role");

  const db = await ensureDb();
  const result = role
    ? await db.execute({
        sql: "SELECT id, role, category, category_icon, name, duration, description, steps, video_url, sort_order FROM drills WHERE role = ? AND is_active = 1 ORDER BY category, sort_order, id",
        args: [role],
      })
    : await db.execute(
        "SELECT id, role, category, category_icon, name, duration, description, steps, video_url, sort_order FROM drills WHERE is_active = 1 ORDER BY role, category, sort_order, id"
      );

  const drills: DrillDto[] = result.rows.map((row) => {
    const r = row as unknown as Record<string, unknown>;
    let steps: string[] = [];
    try {
      steps = JSON.parse((r.steps as string) || "[]");
    } catch {
      steps = [];
    }
    return {
      id: r.id as number,
      role: r.role as string,
      category: r.category as string,
      category_icon: (r.category_icon as string) || "Target",
      name: r.name as string,
      duration: (r.duration as string) || "",
      description: (r.description as string) || "",
      steps,
      video_url: (r.video_url as string) || "",
      sort_order: (r.sort_order as number) || 0,
    };
  });

  return NextResponse.json({ drills });
}
