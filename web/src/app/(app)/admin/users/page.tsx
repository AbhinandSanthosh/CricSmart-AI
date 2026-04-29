"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Search } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/store/auth";
import { UserActionsMenu, type AdminUserRow } from "@/components/admin/UserActionsMenu";

interface FullUser extends AdminUserRow {
  uid: string;
  primary_role: string;
  skill_level: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<FullUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function downloadCsv() {
    setExporting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch("/api/admin/users/export", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `criceye-users-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const q = filter.trim().toLowerCase();
  const filtered = q
    ? users.filter((u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    : users;

  const adminCount = users.filter((u) => u.is_admin === 1 && !u.deactivated_at).length;
  const activeCount = users.filter((u) => !u.deactivated_at).length;

  return (
    <div>
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">User Management</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {users.length} total · {activeCount} active · {adminCount} admin
          </p>
        </div>
        <button onClick={downloadCsv} disabled={exporting} className="btn btn-secondary text-sm disabled:opacity-50">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="label-bracket">user_database</span>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              placeholder="Search by name or email..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg pl-8 pr-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--cs-accent)]"
            />
          </div>
        </div>
        {loading ? (
          <div className="text-center py-10 text-[var(--text-muted)] text-[13px] font-bold tracking-wider">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b border-[var(--cs-border)]">
                  {["ID", "Username", "Email", "Role", "Skill", "Status", "Joined", ""].map((h) => (
                    <th key={h} className="pb-3 font-bold text-[10px] tracking-widest text-[var(--text-muted)] text-left uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isSelf = currentUser?.uid === u.uid;
                  return (
                    <tr key={u.id} className={`border-b border-[var(--cs-border)] ${u.deactivated_at ? "opacity-50" : ""}`}>
                      <td className="py-3 text-[var(--text-muted)]">{u.id}</td>
                      <td className="py-3 font-semibold text-[var(--text-main)]">
                        {u.username}
                        {isSelf && <span className="ml-2 text-[10px] text-[var(--cs-accent)] font-bold">YOU</span>}
                      </td>
                      <td className="py-3 text-[var(--text-muted)]">{u.email}</td>
                      <td className="py-3">
                        <span className="label-bracket">{u.primary_role}</span>
                      </td>
                      <td className="py-3 text-[var(--text-muted)]">{u.skill_level}</td>
                      <td className="py-3">
                        <div className="flex flex-col gap-1">
                          {u.is_admin === 1 && (
                            <span className="text-[10px] font-bold text-[var(--cs-accent)] tracking-wider">ADMIN</span>
                          )}
                          {u.deactivated_at && (
                            <span className="text-[10px] font-bold text-red-400 tracking-wider">DEACTIVATED</span>
                          )}
                          {u.is_admin !== 1 && !u.deactivated_at && (
                            <span className="text-[10px] text-[var(--text-muted)] tracking-wider">player</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-[var(--text-muted)]">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 text-right">
                        <UserActionsMenu user={u} isSelf={isSelf} onChange={refresh} />
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[var(--text-muted)] text-sm">
                      No users match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
