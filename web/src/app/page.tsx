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
      <div className="animate-pulse text-amber font-bold text-2xl tracking-widest">
        CRICSMART AI
      </div>
    </div>
  );
}
