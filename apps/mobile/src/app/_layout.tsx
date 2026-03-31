import { Stack } from "expo-router";
import { AppProviders } from "../lib/providers";

export default function RootLayout() {
  return (
    <AppProviders>
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
        <Stack.Screen name="health/[petId]" options={{ title: "Health Records" }} />
        <Stack.Screen name="medication/[petId]" options={{ title: "Medications" }} />
        <Stack.Screen name="auth/sign-in" options={{ title: "Sign In", headerShown: false }} />
        <Stack.Screen name="auth/sign-up" options={{ title: "Sign Up", headerShown: false }} />
        <Stack.Screen name="onboard" options={{ title: "Set Up Household" }} />
        <Stack.Screen name="join" options={{ title: "Join Household" }} />
      </Stack>
    </AppProviders>
  );
}
