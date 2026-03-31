import { ScrollView, Alert, Pressable } from "react-native";
import { YStack, XStack, Text, Input } from "tamagui";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Card } from "@petforce/ui";
import { trpc } from "../lib/trpc";
import { useHousehold } from "../lib/household";
import { DEFAULT_THEME } from "@petforce/core";

export default function OnboardScreen() {
  const router = useRouter();
  const { setHouseholdId } = useHousehold();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");

  const utils = trpc.useUtils();
  const onboardMutation = trpc.dashboard.onboard.useMutation({
    onSuccess: (household) => {
      setHouseholdId(household.id);
      utils.dashboard.myHouseholds.invalidate();
      router.replace("/");
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const handleCreate = () => {
    if (!name.trim() || !displayName.trim()) {
      Alert.alert("Missing info", "Please enter a household name and your display name.");
      return;
    }
    onboardMutation.mutate({
      name: name.trim(),
      displayName: displayName.trim(),
      theme: DEFAULT_THEME,
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <YStack padding="$6" gap="$4">
        <YStack alignItems="center" marginBottom="$4">
          <Text fontSize={48}>🏠</Text>
          <Text fontSize="$7" fontWeight="bold" marginTop="$2">Create Household</Text>
          <Text color="$petforceTextMuted">Set up your pet care hub</Text>
        </YStack>

        <YStack gap="$2">
          <Text fontWeight="bold">Household Name</Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="e.g. The Smith Family"
            borderColor="$pfBorder"
          />
        </YStack>

        <YStack gap="$2">
          <Text fontWeight="bold">Your Display Name</Text>
          <Input
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Sarah"
            borderColor="$pfBorder"
          />
        </YStack>

        <Pressable onPress={handleCreate}>
          <Card
            backgroundColor="$petforcePrimary"
            padding="$3"
            alignItems="center"
            marginTop="$4"
          >
            <Text color="white" fontWeight="bold" fontSize="$4">Create Household</Text>
          </Card>
        </Pressable>

        <XStack justifyContent="center" marginTop="$2">
          <Text color="$petforceTextMuted">Have a join code? </Text>
          <Text
            color="$petforcePrimary"
            fontWeight="bold"
            onPress={() => router.push("/join")}
          >
            Join instead
          </Text>
        </XStack>
      </YStack>
    </ScrollView>
  );
}
