import { NextRequest, NextResponse } from "next/server";

const ML_SERVICE_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const outgoing = new FormData();
    for (const [key, value] of formData.entries()) {
      outgoing.append(key, value);
    }

    const res = await fetch(`${ML_SERVICE_URL}/analyze`, {
      method: "POST",
      body: outgoing,
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "ML service unavailable" }, { status: 502 });
  }
}
