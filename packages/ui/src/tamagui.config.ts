import { createTamagui } from "tamagui";
import { config } from "@tamagui/config/v3";

/**
 * PetForce theme palettes — single source of truth for light/dark colors.
 * Web: synced to CSS custom properties via ThemeProvider.
 * Mobile: consumed via Tamagui's useTheme() hook.
 */
export const petforceThemes = {
  light: {
    pfBg: "#FAFAFA",
    pfSurface: "#FFFFFF",
    pfText: "#1A1A2E",
    pfTextMuted: "#6B7280",
    pfTextSecondary: "#8B8FA3",
    pfPrimary: "#6366F1",
    pfPrimaryHover: "#4F46E5",
    pfSecondary: "#EC4899",
    pfBorder: "rgba(99, 102, 241, 0.08)",
    pfBorderStrong: "rgba(99, 102, 241, 0.12)",
    pfOverlay: "rgba(255, 255, 255, 0.8)",
    pfOverlayStrong: "rgba(255, 255, 255, 0.95)",
    pfShadow: "rgba(0, 0, 0, 0.1)",
    pfShadowSoft: "rgba(0, 0, 0, 0.05)",
    pfHighlight: "rgba(99, 102, 241, 0.08)",
  },
  dark: {
    pfBg: "#0F0F1A",
    pfSurface: "#1A1A2E",
    pfText: "#E8E8F0",
    pfTextMuted: "#9CA3AF",
    pfTextSecondary: "#6B7280",
    pfPrimary: "#818CF8",
    pfPrimaryHover: "#6366F1",
    pfSecondary: "#F472B6",
    pfBorder: "rgba(129, 140, 248, 0.1)",
    pfBorderStrong: "rgba(129, 140, 248, 0.18)",
    pfOverlay: "rgba(15, 15, 26, 0.85)",
    pfOverlayStrong: "rgba(26, 26, 46, 0.95)",
    pfShadow: "rgba(0, 0, 0, 0.3)",
    pfShadowSoft: "rgba(0, 0, 0, 0.15)",
    pfHighlight: "rgba(129, 140, 248, 0.1)",
  },
} as const;

/** CSS custom property name for each theme key */
const pfCssVarMap: Record<keyof typeof petforceThemes.light, string> = {
  pfBg: "--pf-bg",
  pfSurface: "--pf-surface",
  pfText: "--pf-text",
  pfTextMuted: "--pf-text-muted",
  pfTextSecondary: "--pf-text-secondary",
  pfPrimary: "--pf-primary",
  pfPrimaryHover: "--pf-primary-hover",
  pfSecondary: "--pf-secondary",
  pfBorder: "--pf-border",
  pfBorderStrong: "--pf-border-strong",
  pfOverlay: "--pf-overlay",
  pfOverlayStrong: "--pf-overlay-strong",
  pfShadow: "--pf-shadow",
  pfShadowSoft: "--pf-shadow-soft",
  pfHighlight: "--pf-highlight",
};

export { pfCssVarMap };

export const tamaguiConfig = createTamagui({
  ...config,
  tokens: {
    ...config.tokens,
    color: {
      ...config.tokens.color,
      petforcePrimary: "#6366F1",
      petforceSecondary: "#EC4899",
      petforceBg: "#FAFAFA",
      petforceSurface: "#FFFFFF",
      petforceText: "#1A1A2E",
      petforceTextMuted: "#6B7280",
    },
  },
  themes: {
    ...config.themes,
    light: {
      ...(config.themes as Record<string, Record<string, string>>)?.light,
      ...petforceThemes.light,
    },
    dark: {
      ...(config.themes as Record<string, Record<string, string>>)?.dark,
      ...petforceThemes.dark,
    },
  },
});

export default tamaguiConfig;

export type AppConfig = typeof tamaguiConfig;

declare module "tamagui" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}
