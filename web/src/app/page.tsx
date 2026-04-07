"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";

export default function RootPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();

  useEffect(() => {
    fetchUser().then(() => {
      const user = useAuth.getState().user;
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    });
  }, [fetchUser, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/criceye-mark.png"
          alt="CricEye"
          style={{ width: 96, height: 96, filter: 'brightness(1.6) saturate(1.1)' }}
        />
        <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.2em', fontWeight: 700 }}>LOADING</div>
      </div>
    </div>
  );
}
