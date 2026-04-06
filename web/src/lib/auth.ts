import { ensureDb } from "./db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";

export interface User {
  id: number;
  username: string;
  email: string;
  phone: string;
  profile_photo: string;
  primary_role: string;
  bowling_style: string;
  skill_level: string;
  is_admin: number;
  created_at: string;
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as number,
    username: (row.username as string) || "",
    email: (row.email as string) || "",
    phone: (row.phone as string) || "",
    profile_photo: (row.profile_photo as string) || "",
    primary_role: (row.primary_role as string) || "Batter",
    bowling_style: (row.bowling_style as string) || "",
    skill_level: (row.skill_level as string) || "Beginner",
    is_admin: (row.is_admin as number) || 0,
    created_at: (row.created_at as string) || "",
  };
}

export async function createUser(
  email: string,
  password: string,
  username: string,
  role: string,
  skillLevel: string,
  bowlingStyle?: string
): Promise<User> {
  const db = await ensureDb();
  const existing = await db.execute({
    sql: "SELECT id FROM users WHERE email = ?",
    args: [email],
  });
  if (existing.rows.length > 0) throw new Error("Email already registered");

  const hash = bcrypt.hashSync(password, 10);
  const result = await db.execute({
    sql: "INSERT INTO users (username, email, password, primary_role, bowling_style, skill_level) VALUES (?, ?, ?, ?, ?, ?)",
    args: [username, email, hash, role, bowlingStyle || "", skillLevel],
  });

  const newUser = await db.execute({
    sql: "SELECT * FROM users WHERE id = ?",
    args: [result.lastInsertRowid!],
  });
  return rowToUser(newUser.rows[0] as unknown as Record<string, unknown>);
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<User | null> {
  const db = await ensureDb();
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0] as unknown as Record<string, unknown>;
  if (!bcrypt.compareSync(password, row.password as string)) return null;
  return rowToUser(row);
}

export async function createSession(userId: number): Promise<string> {
  const db = await ensureDb();
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.execute({
    sql: "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
    args: [sessionId, userId, expiresAt],
  });
  const cookieStore = await cookies();
  cookieStore.set("session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return sessionId;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  if (!sessionId) return null;

  const db = await ensureDb();
  const session = await db.execute({
    sql: "SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')",
    args: [sessionId],
  });
  if (session.rows.length === 0) return null;

  const userId = (session.rows[0] as unknown as Record<string, unknown>).user_id;
  const user = await db.execute({
    sql: "SELECT id, username, email, phone, profile_photo, primary_role, bowling_style, skill_level, is_admin, created_at FROM users WHERE id = ?",
    args: [userId as number],
  });
  if (user.rows.length === 0) return null;
  return rowToUser(user.rows[0] as unknown as Record<string, unknown>);
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  if (sessionId) {
    const db = await ensureDb();
    await db.execute({
      sql: "DELETE FROM sessions WHERE id = ?",
      args: [sessionId],
    });
  }
  cookieStore.delete("session");
}
