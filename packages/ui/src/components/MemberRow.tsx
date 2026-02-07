import { styled, Text, XStack } from "tamagui";

const roleBadgeColors: Record<string, string> = {
  owner: "#6366F1",
  admin: "#3B82F6",
  member: "#6B7280",
  sitter: "#22C55E",
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

  const badgeColor = roleBadgeColors[role] ?? "#6B7280";

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
        backgroundColor={badgeColor}
      >
        <Text fontSize="$2" color="white" textTransform="capitalize">
          {role}
        </Text>
      </XStack>
    </MemberRowFrame>
  );
}
