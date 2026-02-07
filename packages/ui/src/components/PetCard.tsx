import { styled, Text, XStack, YStack } from "tamagui";

const speciesEmoji: Record<string, string> = {
  dog: "🐕",
  cat: "🐈",
  bird: "🐦",
  fish: "🐟",
  reptile: "🦎",
  other: "🐾",
};

const PetCardFrame = styled(YStack, {
  backgroundColor: "$petforceSurface",
  borderRadius: "$4",
  padding: "$4",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
  gap: "$2",
});

const SpeciesBadge = styled(XStack, {
  backgroundColor: "$petforcePrimary",
  borderRadius: "$2",
  paddingHorizontal: "$2",
  paddingVertical: "$1",
  alignSelf: "flex-start",
});

export function PetCard({
  name,
  species,
  breed,
}: {
  name: string;
  species: string;
  breed?: string | null;
}) {
  const emoji = speciesEmoji[species] ?? "🐾";

  return (
    <PetCardFrame>
      <Text fontSize={36} textAlign="center">
        {emoji}
      </Text>
      <Text fontSize="$5" fontWeight="700" color="$petforceText">
        {name}
      </Text>
      {breed && (
        <Text fontSize="$3" color="$petforceTextMuted">
          {breed}
        </Text>
      )}
      <SpeciesBadge>
        <Text fontSize="$2" color="white" textTransform="capitalize">
          {species}
        </Text>
      </SpeciesBadge>
    </PetCardFrame>
  );
}
