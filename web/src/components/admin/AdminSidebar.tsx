"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Dumbbell, MessageSquare, Activity, Megaphone } from "lucide-react";

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/drills", label: "Drills", icon: Dumbbell },
  { href: "/admin/coach", label: "AI Coach", icon: MessageSquare },
  { href: "/admin/health", label: "API Health", icon: Activity },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2 border-b border-[var(--cs-border)] pb-4 mb-6">
      {ADMIN_NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all no-underline ${
              active
                ? "bg-[var(--cs-accent-light)] text-[var(--cs-accent)] border-[var(--cs-accent)]"
                : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--cs-border)] hover:text-[var(--text-main)]"
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
