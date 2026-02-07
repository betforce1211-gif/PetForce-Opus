import { Text, YStack } from "tamagui";
import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <YStack alignItems="center" justifyContent="center" padding="$6" gap="$3">
      <Text fontSize={48}>{icon}</Text>
      <Text fontSize="$5" fontWeight="700" color="$petforceText" textAlign="center">
        {title}
      </Text>
      <Text fontSize="$3" color="$petforceTextMuted" textAlign="center">
        {description}
      </Text>
      {action}
    </YStack>
  );
}
