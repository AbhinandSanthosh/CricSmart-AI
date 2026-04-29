import { adminAuth } from "./firebase-admin";
import { ensureDb } from "./db";

export class AdminActionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

async function countActiveAdmins(): Promise<number> {
  const db = await ensureDb();
  const r = await db.execute(
    "SELECT COUNT(*) as n FROM users WHERE is_admin = 1 AND deactivated_at IS NULL"
  );
  return (r.rows[0]?.n as number) ?? 0;
}

export async function setUserAdmin(targetId: number, value: boolean, actorId: number): Promise<void> {
  const db = await ensureDb();

  if (targetId === actorId && !value) {
    throw new AdminActionError("You can't demote yourself.", 403);
  }

  const target = await db.execute({
    sql: "SELECT id, uid, is_admin, deactivated_at FROM users WHERE id = ?",
    args: [targetId],
  });
  if (target.rows.length === 0) throw new AdminActionError("User not found.", 404);
  const t = target.rows[0] as unknown as Record<string, unknown>;

  if (!value && (t.is_admin as number) === 1) {
    const remaining = await countActiveAdmins();
    if (remaining <= 1) throw new AdminActionError("Can't demote the only remaining admin.", 403);
  }

  await db.execute({
    sql: "UPDATE users SET is_admin = ? WHERE id = ?",
    args: [value ? 1 : 0, targetId],
  });

  // Best-effort: keep Firebase claim aligned.
  try {
    if (t.uid) await adminAuth.setCustomUserClaims(t.uid as string, { admin: value });
  } catch {
    /* noop */
  }
}

export async function setUserDeactivated(targetId: number, deactivated: boolean, actorId: number): Promise<void> {
  const db = await ensureDb();

  if (targetId === actorId && deactivated) {
    throw new AdminActionError("You can't deactivate yourself.", 403);
  }

  const target = await db.execute({
    sql: "SELECT id, uid, is_admin, deactivated_at FROM users WHERE id = ?",
    args: [targetId],
  });
  if (target.rows.length === 0) throw new AdminActionError("User not found.", 404);
  const t = target.rows[0] as unknown as Record<string, unknown>;

  if (deactivated && (t.is_admin as number) === 1) {
    const remaining = await countActiveAdmins();
    if (remaining <= 1) throw new AdminActionError("Can't deactivate the only remaining admin.", 403);
  }

  await db.execute({
    sql: deactivated
      ? "UPDATE users SET deactivated_at = datetime('now') WHERE id = ?"
      : "UPDATE users SET deactivated_at = NULL WHERE id = ?",
    args: [targetId],
  });

  try {
    if (t.uid) await adminAuth.updateUser(t.uid as string, { disabled: deactivated });
  } catch {
    /* noop */
  }
}

export async function deleteUserCascade(targetId: number, actorId: number): Promise<void> {
  const db = await ensureDb();

  if (targetId === actorId) {
    throw new AdminActionError("You can't delete yourself.", 403);
  }

  const target = await db.execute({
    sql: "SELECT id, uid, is_admin FROM users WHERE id = ?",
    args: [targetId],
  });
  if (target.rows.length === 0) throw new AdminActionError("User not found.", 404);
  const t = target.rows[0] as unknown as Record<string, unknown>;

  if ((t.is_admin as number) === 1) {
    const remaining = await countActiveAdmins();
    if (remaining <= 1) throw new AdminActionError("Can't delete the only remaining admin.", 403);
  }

  // Cascade — libsql batch runs in a single transaction.
  await db.batch(
    [
      { sql: "DELETE FROM analyses WHERE user_id = ?", args: [targetId] },
      { sql: "DELETE FROM badges WHERE user_id = ?", args: [targetId] },
      { sql: "DELETE FROM streaks WHERE user_id = ?", args: [targetId] },
      { sql: "DELETE FROM chat_messages WHERE user_id = ?", args: [targetId] },
      { sql: "DELETE FROM drill_completions WHERE user_id = ?", args: [targetId] },
      { sql: "DELETE FROM users WHERE id = ?", args: [targetId] },
    ],
    "write"
  );

  try {
    if (t.uid) await adminAuth.deleteUser(t.uid as string);
  } catch {
    /* user may already be gone in Firebase */
  }
}
