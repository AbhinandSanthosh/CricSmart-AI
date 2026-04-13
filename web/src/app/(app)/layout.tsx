"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Home,
  Activity,
  Dumbbell,
  MessageCircle,
  Video,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  ArrowRight,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/biometric", label: "Biometrics Lab", icon: Activity },
  { href: "/ball-tracking", label: "Ball Tracking", icon: Video },
  { href: "/drills", label: "Training Academy", icon: Dumbbell },
  { href: "/mentor", label: "AI Coach", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/biometric": "Biometrics Lab",
  "/ball-tracking": "Ball Tracking",
  "/drills": "Training Academy",
  "/mentor": "AI Coach",
  "/profile": "Profile",
  "/settings": "Settings",
  "/admin": "Admin Panel",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, firebaseUser, initialized, logout: doLogout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (initialized && !firebaseUser) {
      router.replace("/login");
    }
  }, [initialized, firebaseUser, router]);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[var(--cs-accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-[var(--text-muted)]">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  async function handleLogout() {
    await doLogout();
    router.replace("/login");
  }

  const pageLabel = PAGE_LABELS[pathname] || "CricEye AI";

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      {/* Desktop Sidebar */}
      <aside className="cs-sidebar hidden md:flex flex-col">
        {/* Brand */}
        <div className="cs-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/criceye-mark.png" alt="CricEye" className="w-8 h-8" />
          <span className="text-base font-bold text-[var(--text-main)] ml-2.5">CricEye AI</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3">
          <ul className="list-none p-0 m-0">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`nav-item ${active ? "active" : ""}`}
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User profile */}
        <div className="user-profile">
          <div
            className="avatar"
            style={user?.profile_photo ? {
              background: `url(${user.profile_photo}) center/cover`,
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            } : undefined}
          >
            {!user?.profile_photo && user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-semibold text-[var(--text-main)] truncate">
              {user?.username}
            </span>
            <span className="text-xs text-[var(--text-muted)] truncate">
              {user?.primary_role} &middot; {user?.skill_level}
            </span>
          </div>
        </div>

        {/* Logout */}
        <div className="px-3 pb-4">
          <button
            onClick={handleLogout}
            className="nav-item w-full cursor-pointer bg-transparent border-none text-[var(--text-muted)]"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-y-auto relative z-1">
        {/* Header bar */}
        <header className="header-top">
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="bg-transparent border-none text-[var(--text-main)] cursor-pointer p-1"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Page title */}
          <h1 className="hidden md:block text-lg font-semibold text-[var(--text-main)]">
            {pageLabel}
          </h1>

          {/* Header actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/biometric" className="btn btn-secondary header-stance-btn text-sm no-underline">
              Stance Lab
            </Link>
            <Link href="/drills" className="btn btn-primary text-sm no-underline">
              Start Drill
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <div className="md:hidden absolute top-[57px] left-0 right-0 z-50 bg-[var(--bg-panel)] border-b border-[var(--cs-border)] shadow-lg">
            <nav className="p-3">
              <ul className="list-none p-0 m-0">
                {NAV_ITEMS.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`nav-item ${active ? "active" : ""}`}
                      >
                        <item.icon className="w-[18px] h-[18px]" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
                <li className="border-t border-[var(--cs-border)] mt-2 pt-2">
                  <button
                    onClick={() => { setMobileOpen(false); handleLogout(); }}
                    className="nav-item w-full cursor-pointer bg-transparent border-none text-[var(--text-muted)]"
                  >
                    <LogOut className="w-[18px] h-[18px]" />
                    Logout
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}

        {/* Page content */}
        <div className="p-8 max-w-[1600px] max-md:p-4">
          {children}
        </div>
      </main>
    </div>
  );
}
