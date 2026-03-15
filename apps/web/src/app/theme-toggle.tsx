"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div style={{ width: 32, height: 32 }} />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: 32,
        height: 32,
        borderRadius: "0.5rem",
        border: "1px solid var(--pf-border-strong)",
        background: "var(--pf-surface)",
        color: "var(--pf-text-muted)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1rem",
        transition: "background-color 0.15s ease, border-color 0.15s ease",
      }}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
