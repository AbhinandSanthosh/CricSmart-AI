"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        className="theme-toggle"
        aria-label="Toggle theme"
      >
        <Sun style={{ width: 18, height: 18 }} />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="theme-toggle"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun style={{ width: 18, height: 18 }} />
      ) : (
        <Moon style={{ width: 18, height: 18 }} />
      )}
    </button>
  );
}
