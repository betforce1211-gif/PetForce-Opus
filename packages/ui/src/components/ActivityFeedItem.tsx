import { styled, Text, XStack, YStack } from "tamagui";

const activityTypeIcons: Record<string, string> = {
  walk: "🚶",
  feeding: "🍽️",
  vet_visit: "🏥",
  medication: "💊",
  grooming: "✂️",
  play: "🎾",
  other: "📝",
};

const FeedItemFrame = styled(XStack, {
  alignItems: "flex-start",
  gap: "$3",
  paddingVertical: "$2",
  borderBottomWidth: 1,
  borderBottomColor: "#E5E7EB",
});

export function ActivityFeedItem({
  type,
  title,
  petName,
  memberName,
  createdAt,
}: {
  type: string;
  title: string;
  petName?: string;
  memberName?: string;
  createdAt: Date;
}) {
  const icon = activityTypeIcons[type] ?? "📝";
  const timeAgo = formatTimeAgo(createdAt);

  return (
    <FeedItemFrame>
      <Text fontSize={20}>{icon}</Text>
      <YStack flex={1} gap="$1">
        <Text fontSize="$4" fontWeight="600" color="$petforceText">
          {title}
        </Text>
        <XStack gap="$2">
          {petName && (
            <Text fontSize="$2" color="$petforceTextMuted">
              {petName}
            </Text>
          )}
          {petName && memberName && (
            <Text fontSize="$2" color="$petforceTextMuted">
              •
            </Text>
          )}
          {memberName && (
            <Text fontSize="$2" color="$petforceTextMuted">
              {memberName}
            </Text>
          )}
        </XStack>
      </YStack>
      <Text fontSize="$2" color="$petforceTextMuted">
        {timeAgo}
      </Text>
    </FeedItemFrame>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
