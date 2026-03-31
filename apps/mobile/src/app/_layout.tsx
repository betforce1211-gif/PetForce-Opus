import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { AppProviders } from "../lib/providers";
import { usePushNotifications } from "../lib/notifications";

/** Registers for push notifications when the user is signed in. Renders nothing. */
function NotificationRegistrar() {
  usePushNotifications();
  return null;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "auth";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/auth/sign-in");
    } else if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isSignedIn, isLoaded, segments, router]);

  return (
    <>
      {isSignedIn && <NotificationRegistrar />}
      {children}
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <AuthGuard>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#6366F1" },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "bold" },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="pet/[id]" options={{ title: "Pet Details" }} />
          <Stack.Screen name="pet/new" options={{ title: "Add Pet" }} />
          <Stack.Screen name="pet/edit/[id]" options={{ title: "Edit Pet" }} />
          <Stack.Screen name="activity/new" options={{ title: "Log Activity" }} />
          <Stack.Screen name="feeding/index" options={{ title: "Feeding Schedules" }} />
          <Stack.Screen name="feeding/new" options={{ title: "Add Feeding Schedule" }} />
          <Stack.Screen name="health/[petId]" options={{ title: "Health Records" }} />
          <Stack.Screen name="health/new" options={{ title: "Add Health Record" }} />
          <Stack.Screen name="health/vaccinations" options={{ title: "Vaccination Tracker" }} />
          <Stack.Screen name="medication/[petId]" options={{ title: "Medications" }} />
          <Stack.Screen name="medication/new" options={{ title: "Add Medication" }} />
          <Stack.Screen name="medication/daily" options={{ title: "Daily Medications" }} />
          <Stack.Screen name="auth/sign-in" options={{ title: "Sign In", headerShown: false }} />
          <Stack.Screen name="auth/sign-up" options={{ title: "Sign Up", headerShown: false }} />
          <Stack.Screen name="onboard" options={{ title: "Set Up Household" }} />
          <Stack.Screen name="join" options={{ title: "Join Household" }} />
        </Stack>
      </AuthGuard>
    </AppProviders>
  );
}
