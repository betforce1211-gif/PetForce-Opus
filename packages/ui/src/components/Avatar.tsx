import { styled, Circle } from "tamagui";

export const AvatarCircle = styled(Circle, {
  backgroundColor: "$petforcePrimary",
  justifyContent: "center",
  alignItems: "center",
  overflow: "hidden",

  variants: {
    size: {
      sm: { width: 32, height: 32 },
      md: { width: 48, height: 48 },
      lg: { width: 72, height: 72 },
      xl: { width: 96, height: 96 },
    },
  } as const,

  defaultVariants: {
    size: "md",
  },
});
