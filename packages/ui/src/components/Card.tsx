import { styled, YStack } from "tamagui";

export const Card = styled(YStack, {
  backgroundColor: "$petforceSurface",
  borderRadius: "$4",
  padding: "$4",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,

  variants: {
    hoverable: {
      true: {
        hoverStyle: { shadowOpacity: 0.1, scale: 1.01 },
      },
    },
  } as const,
});
