import { useState, useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useRouter } from "expo-router";
import { trpc } from "./trpc";
import { useHousehold } from "./household";

// Configure how notifications are displayed when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("petforce", {
      name: "PetForce",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#6366F1",
    });
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not already granted
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  // Get the Expo push token
  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );

  return tokenResponse.data;
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();
  const router = useRouter();
  const { householdId } = useHousehold();

  const registerMutation = trpc.notification.registerPushToken.useMutation();
  const unregisterMutation = trpc.notification.unregisterPushToken.useMutation();

  const register = useCallback(async () => {
    const token = await registerForPushNotificationsAsync();
    setExpoPushToken(token);

    if (token && householdId) {
      registerMutation.mutate({ householdId, expoPushToken: token });
    }

    // Update permission status
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);

    return token;
  }, [householdId, registerMutation]);

  const unregister = useCallback(async () => {
    if (householdId) {
      unregisterMutation.mutate({ householdId });
    }
    setExpoPushToken(null);
  }, [householdId, unregisterMutation]);

  useEffect(() => {
    // Register on mount when household is available
    if (householdId) {
      register();
    }

    // Listen for incoming notifications (foreground)
    notificationListener.current =
      Notifications.addNotificationReceivedListener((_notification) => {
        // Notification received while app is foregrounded — display is handled
        // by the notification handler configured above
      });

    // Listen for notification taps (user interaction)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;

        // Navigate based on notification template/type
        if (data?.template === "feeding-reminder") {
          router.push("/feeding/");
        } else if (data?.template === "medication-reminder") {
          router.push("/medication/daily");
        } else if (data?.template === "vet-visit-alert") {
          // Navigate to the household's activity feed
          router.push("/(tabs)/activity");
        }
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current,
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [householdId, register, router]);

  return {
    expoPushToken,
    permissionStatus,
    register,
    unregister,
  };
}
