import { ScrollView, Alert, Pressable } from "react-native";
import { YStack, Text, Input } from "tamagui";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Card } from "@petforce/ui";
import { trpc } from "../lib/trpc";
import { useHousehold } from "../lib/household";

export default function JoinHouseholdScreen() {
  const router = useRouter();
  const { setHouseholdId } = useHousehold();
  const [joinCode, setJoinCode] = useState("");
  const [displayName, setDisplayName] = useState("");

  const utils = trpc.useUtils();
  const joinMutation = trpc.accessRequest.create.useMutation({
    onSuccess: () => {
      utils.dashboard.myHouseholds.invalidate();
      Alert.alert(
        "Request Sent",
        "Your request to join has been sent. You'll be notified when it's approved.",
        [{ text: "OK", onPress: () => router.replace("/") }]
      );
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const handleJoin = () => {
    if (!joinCode.trim() || !displayName.trim()) {
      Alert.alert("Missing info", "Please enter a join code and your display name.");
      return;
    }
    joinMutation.mutate({
      joinCode: joinCode.trim(),
      displayName: displayName.trim(),
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <YStack padding="$6" gap="$4">
        <YStack alignItems="center" marginBottom="$4">
          <Text fontSize={48}>🔗</Text>
          <Text fontSize="$7" fontWeight="bold" marginTop="$2">Join Household</Text>
          <Text color="$petforceTextMuted">Enter the code shared by your household</Text>
        </YStack>

        <YStack gap="$2">
          <Text fontWeight="bold">Join Code</Text>
          <Input
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder="e.g. ABC123"
            autoCapitalize="characters"
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

        <Pressable onPress={handleJoin}>
          <Card
            backgroundColor="$petforcePrimary"
            padding="$3"
            alignItems="center"
            marginTop="$4"
          >
            <Text color="white" fontWeight="bold" fontSize="$4">Request to Join</Text>
          </Card>
        </Pressable>
      </YStack>
    </ScrollView>
  );
}
