import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { XStack, Text } from "tamagui";

interface XpToastProps {
  xp: number;
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Animated "+N XP" snackbar that slides in from the top and auto-dismisses.
 */
export function XpToast({ xp, visible, onDismiss }: XpToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => onDismiss());
      }, 1800);

      return () => clearTimeout(timer);
    }
  }, [visible, translateY, opacity, onDismiss]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }], opacity },
      ]}
    >
      <XStack
        backgroundColor="#6366F1"
        borderRadius="$4"
        paddingVertical="$2"
        paddingHorizontal="$4"
        alignItems="center"
        gap="$2"
        shadowColor="black"
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.2}
        shadowRadius={8}
        elevation={8}
      >
        <Text color="white" fontSize="$3">
          {"\u2B50"}
        </Text>
        <Text color="white" fontWeight="bold" fontSize="$5">
          +{xp} XP
        </Text>
      </XStack>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
});
