import { styled, Text, XStack, YStack } from "tamagui";

const HeaderFrame = styled(YStack, {
  gap: "$2",
});

const AccentBar = styled(XStack, {
  height: 4,
  borderRadius: 2,
});

const StatBadge = styled(XStack, {
  backgroundColor: "$petforceBg",
  borderRadius: "$2",
  paddingHorizontal: "$2",
  paddingVertical: "$1",
  gap: "$1",
});

export function HouseholdHeader({
  name,
  primaryColor,
  petCount,
  memberCount,
}: {
  name: string;
  primaryColor: string;
  petCount: number;
  memberCount: number;
}) {
  return (
    <HeaderFrame>
      <AccentBar backgroundColor={primaryColor} />
      <Text fontSize="$7" fontWeight="700" color="$petforceText">
        {name}
      </Text>
      <XStack gap="$3">
        <StatBadge>
          <Text fontSize="$3" color="$petforceTextMuted">
            🐾 {petCount} {petCount === 1 ? "pet" : "pets"}
          </Text>
        </StatBadge>
        <StatBadge>
          <Text fontSize="$3" color="$petforceTextMuted">
            👥 {memberCount} {memberCount === 1 ? "member" : "members"}
          </Text>
        </StatBadge>
      </XStack>
    </HeaderFrame>
  );
}
