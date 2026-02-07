import { createTamagui } from "tamagui";
import { config } from "@tamagui/config/v3";

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
});

export default tamaguiConfig;

export type AppConfig = typeof tamaguiConfig;

declare module "tamagui" {
  interface TamaguiCustomConfig extends AppConfig {}
}
