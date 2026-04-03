"use client";

import { useEffect } from "react";
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
  Shield,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/biometric", label: "Biometric Lab", icon: Activity },
  { href: "/drills", label: "Training Drills", icon: Dumbbell },
  { href: "/mentor", label: "AI Mentor", icon: MessageCircle },
  { href: "/ball-tracking", label: "Ball Tracking", icon: Video },
  { href: "/profile", label: "My Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, fetchUser, logout: doLogout } = useAuth();

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
        <div className="animate-pulse text-amber font-bold text-xl tracking-widest">
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
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col border-r border-border bg-sidebar">
        <div className="p-6 text-center border-b border-border">
          <div className="mx-auto w-11 h-11 bg-amber rounded-xl flex items-center justify-center text-xl mb-2">
            🏏
          </div>
          <div className="font-bold text-lg tracking-[0.2em] text-amber">
            CRICSMART
          </div>
          <div className="text-[10px] tracking-[0.15em] text-muted-foreground mt-0.5">
            AI PLATFORM
          </div>
        </div>

        <ScrollArea className="flex-1 py-3">
          <nav className="px-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-amber/15 text-amber"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            {user?.is_admin === 1 && (
              <Link
                href="/admin"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === "/admin"
                    ? "bg-amber/15 text-amber"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </Link>
            )}
          </nav>
        </ScrollArea>

        <Separator />
        <div className="p-3">
          <div className="px-3 py-2 text-sm text-muted-foreground mb-1">
            {user?.username}{" "}
            <span className="text-xs opacity-60">({user?.primary_role})</span>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-sidebar">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber rounded-lg flex items-center justify-center text-base">
              🏏
            </div>
            <span className="font-bold tracking-widest text-amber text-sm">
              CRICSMART
            </span>
          </div>
          <MobileNav pathname={pathname} user={user} onLogout={handleLogout} />
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

function MobileNav({
  pathname,
  user,
  onLogout,
}: {
  pathname: string;
  user: { is_admin: number };
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(!open)}>
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </Button>
      {open && (
        <div className="absolute top-16 left-0 right-0 bg-sidebar border-b border-border z-50 p-4">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-amber/15 text-amber"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            {user?.is_admin === 1 && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </Link>
            )}
            <Separator className="my-2" />
            <button
              onClick={onLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive w-full"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </nav>
        </div>
      )}
    </>
  );
}

import { useState } from "react";
