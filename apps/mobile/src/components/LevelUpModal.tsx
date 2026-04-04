import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Pressable } from "react-native";
import { YStack, Text } from "tamagui";
import { GAMIFICATION_LEVEL_NAMES } from "@petforce/core";

interface LevelUpModalProps {
  level: number;
  visible: boolean;
  onDismiss: () => void;
}

export function LevelUpModal({ level, visible, onDismiss }: LevelUpModalProps) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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

      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, scale, opacity, onDismiss]);

  if (!visible) return null;

  const names = GAMIFICATION_LEVEL_NAMES.member ?? [];
  const levelName = names[level - 1] ?? `Level ${level}`;

  return (
    <Pressable style={styles.overlay} onPress={onDismiss}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <YStack
          backgroundColor="$petforceSurface"
          borderRadius="$6"
          padding="$6"
          alignItems="center"
          gap="$3"
          shadowColor="black"
          shadowOffset={{ width: 0, height: 8 }}
          shadowOpacity={0.25}
          shadowRadius={16}
          elevation={12}
        >
          <Text fontSize={48}>{"🎉"}</Text>
          <Text fontSize="$2" color="$petforceTextMuted" fontWeight="bold" textTransform="uppercase" letterSpacing={2}>
            Level Up!
          </Text>
          <Text fontSize="$9" fontWeight="bold" color="$petforcePrimary">
            {level}
          </Text>
          <Text fontSize="$5" fontWeight="600" color="$petforceText">
            {levelName}
          </Text>
          <Text fontSize="$2" color="$petforceTextMuted" marginTop="$2">
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
