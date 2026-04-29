"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Banner {
  id: number;
  message: string;
  variant: "info" | "warning" | "success" | string;
}

const CACHE_KEY = "criceye:active-banner";
const DISMISS_PREFIX = "criceye:dismissed-banner:";

function readCache(): Banner | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Banner) : null;
  } catch {
    return null;
  }
}

function writeCache(banner: Banner | null) {
  try {
    if (banner) window.localStorage.setItem(CACHE_KEY, JSON.stringify(banner));
    else window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* noop */
  }
}

function isDismissed(id: number): boolean {
  try {
    return window.localStorage.getItem(`${DISMISS_PREFIX}${id}`) === "1";
  } catch {
    return false;
  }
}

function variantClasses(variant: string): string {
  switch (variant) {
    case "warning":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "success":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    default:
      return "bg-sky-500/15 text-sky-300 border-sky-500/30";
  }
}

export function AnnouncementBanner() {
  const [banner, setBanner] = useState<Banner | null>(() => readCache());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (banner && isDismissed(banner.id)) setDismissed(true);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/announcements/active", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const next: Banner | null = data.banner || null;
        setBanner(next);
        writeCache(next);
        if (next && isDismissed(next.id)) setDismissed(true);
        else setDismissed(false);
      } catch {
        /* offline / network — keep cached value */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [banner]);

  if (!banner || dismissed) return null;

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 border-b text-sm ${variantClasses(banner.variant)}`}>
      <span className="font-medium">{banner.message}</span>
      <button
        type="button"
        onClick={() => {
          try {
            window.localStorage.setItem(`${DISMISS_PREFIX}${banner.id}`, "1");
          } catch {
            /* noop */
          }
          setDismissed(true);
        }}
        className="opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
