import { adminAuth } from "./firebase-admin";
import { ensureDb } from "./db";

export interface User {
  id: number;
  uid: string;
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
    uid: (row.uid as string) || "",
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

/**
 * Verify a Firebase ID token from the Authorization header.
 */
export async function verifyToken(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}

/**
 * Get the user profile from the database by Firebase UID.
 */
export async function getUserByUid(uid: string): Promise<User | null> {
  const db = await ensureDb();
  const result = await db.execute({
    sql: "SELECT id, uid, username, email, phone, profile_photo, primary_role, bowling_style, skill_level, is_admin, created_at FROM users WHERE uid = ?",
    args: [uid],
  });
  if (result.rows.length === 0) return null;
  return rowToUser(result.rows[0] as unknown as Record<string, unknown>);
}

/**
 * Create a new user profile in the database for a Firebase user.
 */
export async function createUserProfile(
  uid: string,
  email: string,
  username: string,
  role: string,
  skillLevel: string,
  bowlingStyle?: string
): Promise<User> {
  const db = await ensureDb();

  // Check if profile already exists
  const existing = await db.execute({
    sql: "SELECT id FROM users WHERE uid = ?",
    args: [uid],
  });
  if (existing.rows.length > 0) {
    return (await getUserByUid(uid))!;
  }

  await db.execute({
    sql: "INSERT INTO users (uid, username, email, password, primary_role, skill_level, bowling_style) VALUES (?, ?, ?, '', ?, ?, ?)",
    args: [uid, username, email, role, skillLevel, bowlingStyle || ""],
  });

  return (await getUserByUid(uid))!;
}

/**
 * Check if a Firebase user has admin claims.
 */
export async function isAdmin(uid: string): Promise<boolean> {
  try {
    const fbUser = await adminAuth.getUser(uid);
    return fbUser.customClaims?.admin === true;
  } catch {
    return false;
  }
}

/**
 * Set admin custom claim on a Firebase user.
 */
export async function setAdminClaim(uid: string, admin: boolean) {
  await adminAuth.setCustomUserClaims(uid, { admin });
}
