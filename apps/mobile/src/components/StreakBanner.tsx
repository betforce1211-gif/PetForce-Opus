import { Pressable } from "react-native";
import { XStack, Text } from "tamagui";
import { Card } from "@petforce/ui";

interface StreakBannerProps {
  currentStreak: number;
  onPress?: () => void;
}

/**
 * Streak-at-risk banner shown on the home screen.
 * Displayed after 6pm when the member has a streak >= 3 days
 * but hasn't logged any activity today.
 */
export function StreakBanner({ currentStreak, onPress }: StreakBannerProps) {
  return (
    <Pressable onPress={onPress}>
      <Card
        backgroundColor="#FEF3C7"
        borderColor="#F59E0B"
        borderWidth={1}
        padding="$3"
      >
        <XStack alignItems="center" gap="$2">
          <Text fontSize="$5">{"🔥"}</Text>
          <Text flex={1} fontSize="$3" fontWeight="600" color="#92400E">
            {currentStreak}-day streak at risk! Log an activity to keep it going.
          </Text>
          <Text fontSize="$3" color="#B45309">{">"}</Text>
        </XStack>
      </Card>
    </Pressable>
  );
}
