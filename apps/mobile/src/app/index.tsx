import { YStack, Text } from "tamagui";

export default function HomeScreen() {
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
      <Text fontSize="$8" fontWeight="bold">
        🐾 PetForce
      </Text>
      <Text fontSize="$4" color="$petforceTextMuted" marginTop="$2">
        Your household pet care hub
      </Text>
    </YStack>
  );
}
