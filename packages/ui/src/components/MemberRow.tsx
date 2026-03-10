import { styled, Text, XStack } from "tamagui";

const roleBadgeColors: Record<string, { bg: string; text: string }> = {
  owner: { bg: "rgba(99, 102, 241, 0.15)", text: "$petforcePrimary" },
  admin: { bg: "rgba(59, 130, 246, 0.15)", text: "#3B82F6" },
  member: { bg: "rgba(107, 114, 128, 0.15)", text: "$petforceTextMuted" },
  sitter: { bg: "rgba(34, 197, 94, 0.15)", text: "#22C55E" },
};

const MemberRowFrame = styled(XStack, {
  alignItems: "center",
  gap: "$3",
  paddingVertical: "$2",
});

const InitialsCircle = styled(XStack, {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: "$petforcePrimary",
  justifyContent: "center",
  alignItems: "center",
});

export function MemberRow({
  displayName,
  role,
}: {
  displayName: string;
  role: string;
}) {
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const badge = roleBadgeColors[role] ?? { bg: "rgba(107, 114, 128, 0.15)", text: "$petforceTextMuted" };

  return (
    <MemberRowFrame>
      <InitialsCircle>
        <Text fontSize="$2" color="white" fontWeight="700">
          {initials}
        </Text>
      </InitialsCircle>
      <Text flex={1} fontSize="$4" color="$petforceText">
        {displayName}
      </Text>
      <XStack
        paddingHorizontal="$2"
        paddingVertical="$1"
        borderRadius="$2"
        backgroundColor={badge.bg}
      >
        <Text fontSize="$2" color={badge.text} fontWeight="600" textTransform="capitalize">
          {role}
        </Text>
      </XStack>
    </MemberRowFrame>
  );
}
