import { styled, Text, XStack } from "tamagui";

export const Badge = styled(XStack, {
  borderRadius: "$10",
  paddingHorizontal: "$2",
  paddingVertical: "$1",
  alignItems: "center",
  justifyContent: "center",

  variants: {
    variant: {
      primary: { backgroundColor: "$petforcePrimary" },
      secondary: { backgroundColor: "$petforceSecondary" },
      success: { backgroundColor: "$green10" },
      warning: { backgroundColor: "$orange10" },
      error: { backgroundColor: "$red10" },
      muted: { backgroundColor: "$pfBorderStrong" },
    },
    size: {
      sm: { paddingHorizontal: "$1.5", paddingVertical: 2 },
      md: { paddingHorizontal: "$2", paddingVertical: "$1" },
      lg: { paddingHorizontal: "$3", paddingVertical: "$1.5" },
    },
  } as const,

  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

export const BadgeText = styled(Text, {
  color: "white",
  fontWeight: "600",

  variants: {
    size: {
      sm: { fontSize: "$1" },
      md: { fontSize: "$2" },
      lg: { fontSize: "$3" },
    },
  } as const,

  defaultVariants: {
    size: "md",
  },
});

export const Chip = styled(XStack, {
  borderRadius: "$10",
  borderWidth: 1,
  borderColor: "$pfBorder",
  backgroundColor: "$petforceSurface",
  paddingHorizontal: "$2.5",
  paddingVertical: "$1",
  alignItems: "center",
  gap: "$1",
  cursor: "pointer",
  pressStyle: { backgroundColor: "$pfHighlight" },

  variants: {
    active: {
      true: {
        backgroundColor: "$petforcePrimary",
        borderColor: "$petforcePrimary",
      },
    },
  } as const,
});

export const ChipText = styled(Text, {
  fontSize: "$2",
  fontWeight: "500",
  color: "$petforceText",

  variants: {
    active: {
      true: { color: "white" },
    },
  } as const,
});
