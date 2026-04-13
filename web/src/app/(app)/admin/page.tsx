"use client";

import { useEffect, useState } from "react";
import { Shield, Users } from "lucide-react";
import { useAuth } from "@/store/auth";
import { auth } from "@/lib/firebase";

interface AdminUser {
  id: number;
  username: string;
  primary_role: string;
  skill_level: string;
  is_admin: number;
  created_at: string;
}

export default function AdminPage() {
  const { firebaseUser, initialized } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Check admin status on mount
  useEffect(() => {
    if (!initialized || !firebaseUser) return;
    let cancelled = false;

    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) { setIsAdmin(false); setLoading(false); return; }

        const res = await fetch("/api/admin/check", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled) {
          setIsAdmin(data.isAdmin === true);
          if (!data.isAdmin) setLoading(false);
        }
      } catch {
        if (!cancelled) { setIsAdmin(false); setLoading(false); }
      }
    })();

    return () => { cancelled = true; };
  }, [initialized, firebaseUser]);

  // Fetch users list once admin status is confirmed
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) { setLoading(false); return; }

        const r = await fetch("/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await r.json();
        if (!cancelled) setUsers(data.users || []);
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isAdmin]);

  if (!initialized || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[var(--cs-accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-[var(--text-muted)]">Checking access...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-8">
            <Shield className="w-12 h-12 text-[var(--cs-accent)] mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-[var(--text-main)] tracking-tight">Access Denied</h1>
            <p className="label-bracket mt-2">restricted_area</p>
          </div>
          <div className="panel p-8">
            <div className="panel-header">
              <span className="label-bracket">authorization</span>
              <h2 className="panel-title">Unauthorized</h2>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              You do not have admin privileges. Contact an administrator if you believe this is an error.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 py-5">
        <p className="label-bracket mb-3 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" /> admin_panel
        </p>
        <h1 className="text-4xl font-bold text-[var(--text-main)] tracking-tight">Admin Panel</h1>
        <p className="text-[var(--text-muted)] text-base mt-2">Manage users and platform</p>
      </div>

      <div className="stats-strip col-span-12">
        <div className="stat-box">
          <div className="label-bracket"><Users className="w-3 h-3 inline align-middle mr-1" />total_users</div>
          <div className="stat-val">{users.length}</div>
        </div>
        <div className="stat-box">
          <div className="label-bracket"><Shield className="w-3 h-3 inline align-middle mr-1" />admin_count</div>
          <div className="stat-val">{users.filter((u) => u.is_admin === 1).length}</div>
        </div>
      </div>

      <div className="panel col-span-12">
        <div className="panel-header">
          <span className="label-bracket">user_database</span>
          <h2 className="panel-title">All Users</h2>
        </div>
        {loading ? (
          <div className="text-center py-10 text-[var(--text-muted)] text-[13px] font-bold tracking-wider">
            Loading...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b border-[var(--cs-border)]">
                  {['ID', 'Username', 'Role', 'Skill', 'Joined', 'Admin'].map((h) => (
                    <th key={h} className="pb-3 font-bold text-[10px] tracking-widest text-[var(--text-muted)] text-left uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--cs-border)]">
                    <td className="py-3 text-[var(--text-muted)]">{u.id}</td>
                    <td className="py-3 font-semibold text-[var(--text-main)]">{u.username}</td>
                    <td className="py-3">
                      <span className="label-bracket">{u.primary_role}</span>
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">{u.skill_level}</td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "\u2014"}
                    </td>
                    <td className="py-3">
                      {u.is_admin === 1 ? (
                        <span className="text-xs font-bold text-[var(--cs-accent)]">Admin</span>
                      ) : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
