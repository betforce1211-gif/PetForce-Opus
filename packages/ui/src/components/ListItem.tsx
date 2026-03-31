import { styled, XStack, YStack, Text } from "tamagui";
import type { ReactNode } from "react";

export const ListItemContainer = styled(XStack, {
  backgroundColor: "$petforceSurface",
  padding: "$3",
  alignItems: "center",
  gap: "$3",
  borderBottomWidth: 1,
  borderBottomColor: "$pfBorder",
  pressStyle: { backgroundColor: "$pfHighlight" },

  variants: {
    compact: {
      true: { padding: "$2", gap: "$2" },
    },
  } as const,
});

export function ListItem({
  icon,
  title,
  subtitle,
  right,
  onPress,
  compact,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  compact?: boolean;
}) {
  return (
    <ListItemContainer compact={compact} onPress={onPress} cursor={onPress ? "pointer" : undefined}>
      {icon}
      <YStack flex={1}>
        <Text fontSize="$3" fontWeight="600" color="$petforceText">
          {title}
        </Text>
        {subtitle && (
          <Text fontSize="$2" color="$petforceTextMuted">
            {subtitle}
          </Text>
        )}
      </YStack>
      {right}
    </ListItemContainer>
  );
}
