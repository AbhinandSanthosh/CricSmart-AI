"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Dumbbell, MessageSquare, Activity, Megaphone, ArrowRight } from "lucide-react";
import { auth } from "@/lib/firebase";

interface Stats {
  total_users: number;
  active_users: number;
  admins: number;
  drills: number;
  banner_active: boolean;
  services_up: number;
  services_total: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        const [usersRes, drillsRes, healthRes, annRes] = await Promise.all([
          fetch("/api/admin/users", { headers }),
          fetch("/api/admin/drills", { headers }),
          fetch("/api/admin/health", { headers }),
          fetch("/api/admin/announcements", { headers }),
        ]);
        const usersData = usersRes.ok ? await usersRes.json() : { users: [] };
        const drillsData = drillsRes.ok ? await drillsRes.json() : { drills: [] };
        const healthData = healthRes.ok ? await healthRes.json() : { services: [] };
        const annData = annRes.ok ? await annRes.json() : { announcement: null };

        const users: { is_admin: number; deactivated_at: string | null }[] = usersData.users || [];
        const services: { status: string }[] = healthData.services || [];
        if (cancelled) return;
        setStats({
          total_users: users.length,
          active_users: users.filter((u) => !u.deactivated_at).length,
          admins: users.filter((u) => u.is_admin === 1 && !u.deactivated_at).length,
          drills: (drillsData.drills || []).length,
          banner_active: !!annData.announcement && annData.announcement.is_active === 1,
          services_up: services.filter((s) => s.status === "ok").length,
          services_total: services.length,
        });
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="py-2 mb-6">
        <h1 className="text-4xl font-bold text-[var(--text-main)] tracking-tight">Admin Dashboard</h1>
        <p className="text-[var(--text-muted)] text-base mt-2">Manage users, content, and platform health</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total users" value={stats ? stats.total_users : "—"} sub={stats ? `${stats.active_users} active` : ""} />
        <StatCard label="Admins" value={stats ? stats.admins : "—"} sub="active accounts" />
        <StatCard label="Drills" value={stats ? stats.drills : "—"} sub="in library" />
        <StatCard label="Services up" value={stats ? `${stats.services_up}/${stats.services_total}` : "—"} sub="external APIs" />
        <StatCard label="Banner" value={stats ? (stats.banner_active ? "ON" : "OFF") : "—"} sub="platform-wide" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickLink href="/admin/users" icon={Users} title="User Management" sub="Promote, demote, deactivate or delete accounts. Export to CSV." />
        <QuickLink href="/admin/drills" icon={Dumbbell} title="Drill Management" sub="Add, edit, or remove Training Academy drills." />
        <QuickLink href="/admin/coach" icon={MessageSquare} title="AI Coach Prompt" sub="Tune the system prompt that drives the coach." />
        <QuickLink href="/admin/health" icon={Activity} title="API Health Monitor" sub="Live status for CricAPI, OpenRouter, and ML service." />
        <QuickLink href="/admin/announcements" icon={Megaphone} title="Announcement Banner" sub="Set the platform-wide message shown to all users." />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="panel p-4">
      <div className="label-bracket mb-1">{label}</div>
      <div className="text-2xl font-bold text-[var(--text-main)]">{value}</div>
      {sub && <div className="text-xs text-[var(--text-muted)] mt-1">{sub}</div>}
    </div>
  );
}

function QuickLink({ href, icon: Icon, title, sub }: { href: string; icon: React.ComponentType<{ className?: string }>; title: string; sub: string }) {
  return (
    <Link href={href} className="panel p-5 no-underline hover:border-[var(--cs-accent)] transition-colors">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-[var(--cs-accent-light)] text-[var(--cs-accent)]">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[var(--text-main)]">{title}</h3>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-1">{sub}</p>
        </div>
      </div>
    </Link>
  );
}
