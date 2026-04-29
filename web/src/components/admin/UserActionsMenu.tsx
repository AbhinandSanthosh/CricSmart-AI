"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { MoreVertical, ShieldCheck, ShieldOff, UserX, UserCheck, Trash2, Loader2 } from "lucide-react";

export interface AdminUserRow {
  id: number;
  username: string;
  email: string;
  is_admin: number;
  deactivated_at: string | null;
}

interface Props {
  user: AdminUserRow;
  isSelf: boolean;
  onChange: () => void;
}

export function UserActionsMenu({ user, isSelf, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(method: "PATCH" | "DELETE", body?: object): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setOpen(false);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function confirmAndCall(message: string, method: "PATCH" | "DELETE", body?: object) {
    if (!window.confirm(message)) return;
    void call(method, body);
  }

  const isAdmin = user.is_admin === 1;
  const isDeactivated = !!user.deactivated_at;

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded hover:bg-[var(--bg-surface)] text-[var(--text-muted)] cursor-pointer"
        aria-label="User actions"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-[var(--cs-border)] bg-[var(--bg-panel)] shadow-lg">
            <div className="py-1 text-sm">
              <button
                disabled={isSelf}
                onClick={() =>
                  confirmAndCall(
                    isAdmin ? `Demote ${user.username}?` : `Promote ${user.username} to admin?`,
                    "PATCH",
                    { is_admin: !isAdmin }
                  )
                }
                className="w-full text-left px-3 py-2 hover:bg-[var(--bg-surface)] flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isAdmin ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                {isAdmin ? "Demote to player" : "Promote to admin"}
              </button>

              <button
                disabled={isSelf}
                onClick={() =>
                  confirmAndCall(
                    isDeactivated ? `Reactivate ${user.username}?` : `Deactivate ${user.username}? They won't be able to log in.`,
                    "PATCH",
                    { deactivated: !isDeactivated }
                  )
                }
                className="w-full text-left px-3 py-2 hover:bg-[var(--bg-surface)] flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeactivated ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                {isDeactivated ? "Reactivate" : "Deactivate"}
              </button>

              <button
                disabled={isSelf}
                onClick={() =>
                  confirmAndCall(
                    `DELETE ${user.username} (${user.email})?\n\nThis removes their account and ALL their data permanently.`,
                    "DELETE"
                  )
                }
                className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-500/10 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Delete user
              </button>

              {error && <div className="px-3 py-2 text-xs text-red-400 border-t border-[var(--cs-border)]">{error}</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
