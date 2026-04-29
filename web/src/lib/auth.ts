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
  deactivated_at: string | null;
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
    deactivated_at: (row.deactivated_at as string) || null,
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
 * Returns null if the user is deactivated — callers treat this as auth failure.
 */
export async function getUserByUid(uid: string): Promise<User | null> {
  const db = await ensureDb();
  const result = await db.execute({
    sql: "SELECT id, uid, username, email, phone, profile_photo, primary_role, bowling_style, skill_level, is_admin, deactivated_at, created_at FROM users WHERE uid = ?",
    args: [uid],
  });
  if (result.rows.length === 0) return null;
  const user = rowToUser(result.rows[0] as unknown as Record<string, unknown>);
  if (user.deactivated_at) return null;
  return user;
}

/**
 * Get a user even if deactivated. Used by admin tooling.
 */
export async function getUserByUidIncludingDeactivated(uid: string): Promise<User | null> {
  const db = await ensureDb();
  const result = await db.execute({
    sql: "SELECT id, uid, username, email, phone, profile_photo, primary_role, bowling_style, skill_level, is_admin, deactivated_at, created_at FROM users WHERE uid = ?",
    args: [uid],
  });
  if (result.rows.length === 0) return null;
  return rowToUser(result.rows[0] as unknown as Record<string, unknown>);
}

/**
 * Create a new user profile in the database for a Firebase user.
 * Bootstraps admin if their email is in ADMIN_EMAILS.
 */
export async function createUserProfile(
  uid: string,
  email: string,
  username: string,
  role: string,
  skillLevel: string,
  bowlingStyle?: string,
  photoUrl?: string
): Promise<User> {
  const db = await ensureDb();

  const existing = await db.execute({
    sql: "SELECT id FROM users WHERE uid = ?",
    args: [uid],
  });
  if (existing.rows.length > 0) {
    return (await getUserByUidIncludingDeactivated(uid))!;
  }

  const isBootstrapAdmin = getAdminEmails().includes(email.toLowerCase());

  await db.execute({
    sql: "INSERT INTO users (uid, username, email, password, primary_role, skill_level, bowling_style, profile_photo, is_admin) VALUES (?, ?, ?, '', ?, ?, ?, ?, ?)",
    args: [uid, username, email, role, skillLevel, bowlingStyle || "", photoUrl || "", isBootstrapAdmin ? 1 : 0],
  });

  return (await getUserByUidIncludingDeactivated(uid))!;
}

/**
 * Get the list of admin emails from env var (comma-separated).
 */
function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

/**
 * Check if a user has admin access.
 *
 * DB-first: `users.is_admin` is the source of truth. ADMIN_EMAILS is a
 * bootstrap mechanism only — if a matching email exists in users with
 * is_admin=0, we promote them once. After that, admins can be promoted
 * or demoted via the admin panel without conflict.
 *
 * Returns false for deactivated users.
 */
export async function isAdmin(uid: string): Promise<boolean> {
  try {
    const db = await ensureDb();

    const result = await db.execute({
      sql: "SELECT id, email, is_admin, deactivated_at FROM users WHERE uid = ?",
      args: [uid],
    });

    if (result.rows.length === 0) return false;
    const row = result.rows[0] as unknown as Record<string, unknown>;

    if (row.deactivated_at) return false;

    if ((row.is_admin as number) === 1) return true;

    // Bootstrap: if email is in ADMIN_EMAILS, promote and return true.
    const email = ((row.email as string) || "").toLowerCase();
    const adminEmails = getAdminEmails();
    if (email && adminEmails.includes(email)) {
      await db.execute({
        sql: "UPDATE users SET is_admin = 1 WHERE id = ?",
        args: [row.id as number],
      });
      // Best-effort: keep the Firebase claim aligned for downstream consumers.
      try {
        await adminAuth.setCustomUserClaims(uid, { admin: true });
      } catch {
        /* noop */
      }
      return true;
    }

    return false;
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
