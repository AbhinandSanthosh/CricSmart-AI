import { NextRequest, NextResponse } from "next/server";
import { verifyToken, createUserProfile } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const decodedToken = await verifyToken(req.headers.get("authorization"));
    if (!decodedToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { username, role, skillLevel, bowlingStyle, photoUrl } = await req.json();
    if (!username || !role || !skillLevel) {
      return NextResponse.json(
        { error: "username, role, and skillLevel are required" },
        { status: 400 }
      );
    }

    const user = await createUserProfile(
      decodedToken.uid,
      decodedToken.email || "",
      username,
      role,
      skillLevel,
      bowlingStyle,
      photoUrl
    );

    return NextResponse.json({ user });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Profile creation failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
