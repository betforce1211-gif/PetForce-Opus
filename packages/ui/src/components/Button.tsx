import { styled, Button as TamaguiButton } from "tamagui";

export const Button = styled(TamaguiButton, {
  borderRadius: "$4",
  fontWeight: "600",

  variants: {
    variant: {
      primary: {
        backgroundColor: "$petforcePrimary",
        color: "white",
        pressStyle: { opacity: 0.85 },
      },
      secondary: {
        backgroundColor: "$petforceSecondary",
        color: "white",
        pressStyle: { opacity: 0.85 },
      },
      outline: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: "$petforcePrimary",
        color: "$petforcePrimary",
        pressStyle: { backgroundColor: "$petforcePrimary", color: "white" },
      },
    },
  } as const,

  defaultVariants: {
    variant: "primary",
  },
});
