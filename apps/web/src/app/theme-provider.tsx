"use client";

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import { useEffect } from "react";
import { petforceThemes, pfCssVarMap } from "@petforce/ui";

/**
 * Syncs Tamagui theme token values to CSS custom properties on <html>,
 * so inline styles using var(--pf-*) respond to theme changes.
 * Source of truth for colors: petforceThemes in @petforce/ui (tamagui.config.ts).
 */
function ThemeSync({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useNextTheme();
  const themeName = resolvedTheme === "dark" ? "dark" : "light";
  const tokens = petforceThemes[themeName];

  useEffect(() => {
    const root = document.documentElement;
    for (const [key, cssVar] of Object.entries(pfCssVarMap)) {
      root.style.setProperty(cssVar, tokens[key as keyof typeof tokens]);
    }
  }, [tokens]);

  return <>{children}</>;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="data-theme" defaultTheme="system" enableSystem>
      <ThemeSync>{children}</ThemeSync>
    </NextThemesProvider>
  );
}
