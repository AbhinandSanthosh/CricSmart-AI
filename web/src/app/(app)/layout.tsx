"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/store/auth";
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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, fetchUser, logout: doLogout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse" style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 18, color: 'var(--cs-accent)', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!user) return null;

  async function handleLogout() {
    await doLogout();
    router.replace("/login");
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── Desktop Sidebar ── */}
      <aside className="cs-sidebar hidden md:flex flex-col">
        {/* Brand */}
        <div className="cs-brand">
          CRIC<span>EYE</span>
        </div>

        {/* Nav */}
        <ul style={{ listStyle: 'none', padding: '0 16px', flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`nav-item ${active ? "active" : ""}`}
                >
                  <item.icon style={{ width: 16, height: 16 }} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* User profile */}
        <div className="user-profile">
          <div className="avatar">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
              {user?.username}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {user?.primary_role} &middot; {user?.skill_level}
            </span>
          </div>
        </div>

        {/* Logout */}
        <div style={{ padding: '0 16px 16px' }}>
          <button
            onClick={handleLogout}
            className="nav-item"
            style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-muted)' }}
          >
            <LogOut style={{ width: 16, height: 16 }} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <main className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        {/* Header bar */}
        <header className="header-top">
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
            >
              {mobileOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
            </button>
          </div>
          <div className="label-bracket hidden md:block">
            {pathname === '/dashboard' ? 'academy_session_active' :
             pathname === '/biometric' ? 'pose_detection_active' :
             pathname === '/ball-tracking' ? 'ball_tracking_module' :
             pathname === '/drills' ? 'training_academy' :
             pathname === '/mentor' ? 'ai_mentor_v2' :
             pathname === '/profile' ? 'player_profile' :
             pathname === '/settings' ? 'account_settings' :
             pathname === '/admin' ? 'admin_panel' : 'criceye_ai'}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/biometric" className="btn btn-secondary" style={{ padding: '8px 20px', fontSize: 14, textDecoration: 'none' }}>
              Stance Lab
            </Link>
            <Link href="/drills" className="btn btn-primary" style={{ padding: '6px 6px 6px 20px', fontSize: 14, textDecoration: 'none' }}>
              Start Drill
              <div className="btn-icon-circle" style={{ width: 28, height: 28, fontSize: 16 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </div>
            </Link>
          </div>
        </header>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <div className="md:hidden" style={{ position: 'absolute', top: 73, left: 0, right: 0, zIndex: 50, background: 'rgba(8, 9, 12, 0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--cs-border)', padding: 16 }}>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`nav-item ${active ? "active" : ""}`}
                    >
                      <item.icon style={{ width: 16, height: 16 }} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li style={{ borderTop: '1px solid var(--cs-border)', marginTop: 8, paddingTop: 8 }}>
                <button
                  onClick={() => { setMobileOpen(false); handleLogout(); }}
                  className="nav-item"
                  style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-muted)' }}
                >
                  <LogOut style={{ width: 16, height: 16 }} />
                  Logout
                </button>
              </li>
            </ul>
          </div>
        )}

        {/* Page content */}
        <div style={{ padding: 40, maxWidth: 1600 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
