import { styled, YStack, XStack } from "tamagui";

export const Skeleton = styled(YStack, {
  backgroundColor: "$pfBorder",
  borderRadius: "$3",
  overflow: "hidden",

  variants: {
    variant: {
      text: { height: 16, borderRadius: "$2" },
      title: { height: 24, borderRadius: "$2", width: "60%" },
      avatar: { width: 48, height: 48, borderRadius: 9999 },
      card: { height: 120, borderRadius: "$4" },
      thumbnail: { width: 64, height: 64, borderRadius: "$3" },
    },
  } as const,

  defaultVariants: {
    variant: "text",
  },
});

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <YStack gap="$3" padding="$3">
      {Array.from({ length: count }, (_, i) => (
        <XStack key={i} gap="$3" alignItems="center">
          <Skeleton variant="avatar" />
          <YStack flex={1} gap="$2">
            <Skeleton variant="title" />
            <Skeleton variant="text" />
          </YStack>
        </XStack>
      ))}
    </YStack>
  );
}
