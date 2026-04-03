import { getDb } from "./db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";

export interface User {
  id: number;
  username: string;
  email: string;
  phone: string;
  primary_role: string;
  bowling_style: string;
  skill_level: string;
  is_admin: number;
  created_at: string;
}

export async function createUser(
  username: string,
  password: string,
  role: string,
  skillLevel: string,
  bowlingStyle?: string
): Promise<User> {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username);
  if (existing) throw new Error("Username already taken");

  const hash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare(
      "INSERT INTO users (username, password, primary_role, bowling_style, skill_level) VALUES (?, ?, ?, ?, ?)"
    )
    .run(username, hash, role, bowlingStyle || "", skillLevel);

  return db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid) as User;
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<User | null> {
  const db = getDb();
  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as (User & { password: string }) | undefined;
  if (!user) return null;
  if (!bcrypt.compareSync(password, user.password)) return null;
  return user;
}

export async function createSession(userId: number): Promise<string> {
  const db = getDb();
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(
    sessionId,
    userId,
    expiresAt
  );
  const cookieStore = await cookies();
  cookieStore.set("session", sessionId, {
    httpOnly: true,
    secure: false,
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

  const db = getDb();
  const session = db
    .prepare("SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')")
    .get(sessionId) as { user_id: number } | undefined;
  if (!session) return null;

  return db.prepare("SELECT id, username, email, phone, primary_role, bowling_style, skill_level, is_admin, created_at FROM users WHERE id = ?").get(
    session.user_id
  ) as User | null;
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  if (sessionId) {
    const db = getDb();
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  }
  cookieStore.delete("session");
}
