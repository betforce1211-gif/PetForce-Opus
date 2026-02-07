import { Stack } from "expo-router";
import { TamaguiProvider } from "tamagui";
import { tamaguiConfig } from "@petforce/ui";

export default function RootLayout() {
  return (
    <TamaguiProvider config={tamaguiConfig}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#6366F1" },
          headerTintColor: "#fff",
          headerTitle: "PetForce",
        }}
      />
    </TamaguiProvider>
  );
}
