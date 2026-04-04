import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Pressable } from "react-native";
import { YStack, XStack, Text } from "tamagui";
import { trpc } from "../lib/trpc";
import { useHousehold } from "../lib/household";

interface BadgeUnlockOverlayProps {
  badgeIds: string[];
  visible: boolean;
  onDismiss: () => void;
}

export function BadgeUnlockOverlay({ badgeIds, visible, onDismiss }: BadgeUnlockOverlayProps) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const { householdId } = useHousehold();

  const achievementsQuery = trpc.gamification.achievements.useQuery(
    { householdId: householdId!, group: "member" },
    { enabled: visible && badgeIds.length > 0 && !!householdId }
  );

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(onDismiss, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible, scale, opacity, onDismiss]);

  if (!visible) return null;

  const badges = (achievementsQuery.data ?? []).filter((a) =>
    badgeIds.includes(a.badgeId)
  );

  return (
    <Pressable style={styles.overlay} onPress={onDismiss}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <YStack
          backgroundColor="$petforceSurface"
          borderRadius="$6"
          padding="$6"
          alignItems="center"
          gap="$4"
          shadowColor="black"
          shadowOffset={{ width: 0, height: 8 }}
          shadowOpacity={0.25}
          shadowRadius={16}
          elevation={12}
          minWidth={280}
        >
          <Text fontSize="$2" color="$petforceTextMuted" fontWeight="bold" textTransform="uppercase" letterSpacing={2}>
            Badge Unlocked!
          </Text>
          {badges.length > 0 ? (
            badges.map((badge) => (
              <YStack key={badge.badgeId} alignItems="center" gap="$1">
                <Text fontSize={40}>{badge.icon}</Text>
                <Text fontSize="$4" fontWeight="bold" color="$petforceText">
                  {badge.name}
                </Text>
                <Text fontSize="$2" color="$petforceTextMuted" textAlign="center">
                  {badge.description}
                </Text>
              </YStack>
            ))
          ) : (
            <XStack gap="$2">
              {badgeIds.map((id) => (
                <Text key={id} fontSize={40}>{"🏅"}</Text>
              ))}
            </XStack>
          )}
          <Text fontSize="$2" color="$petforceTextMuted" marginTop="$1">
            Tap to continue
          </Text>
        </YStack>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
});
