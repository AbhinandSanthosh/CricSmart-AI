"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";

export default function RootPage() {
  const router = useRouter();
  const { firebaseUser, initialized } = useAuth();

  useEffect(() => {
    if (!initialized) return;
    if (firebaseUser) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [initialized, firebaseUser, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)]">
      <div className="animate-pulse flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/criceye-mark.png"
          alt="CricEye"
          className="w-10 h-10"
        />
        <div className="text-xs text-[var(--text-muted)] tracking-widest font-bold">LOADING</div>
      </div>
    </div>
  );
}
