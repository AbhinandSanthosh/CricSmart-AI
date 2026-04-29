"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { useAuth } from "@/store/auth";
import { auth } from "@/lib/firebase";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { firebaseUser, initialized } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!initialized || !firebaseUser) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          if (!cancelled) setAllowed(false);
          return;
        }
        const res = await fetch("/api/admin/check", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!cancelled) setAllowed(data.isAdmin === true);
      } catch {
        if (!cancelled) setAllowed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialized, firebaseUser]);

  if (!initialized || allowed === null) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[var(--cs-accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-[var(--text-muted)]">Checking access...</span>
        </div>
      </div>
    );
  }

  if (!allowed) {
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
            <p className="text-sm text-[var(--text-muted)] mb-4">
              You do not have admin privileges. Contact an administrator if you believe this is an error.
            </p>
            <button onClick={() => router.replace("/dashboard")} className="btn btn-secondary text-sm">
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2">
        <p className="label-bracket flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" /> admin_panel
        </p>
      </div>
      <AdminSidebar />
      {children}
    </div>
  );
}
