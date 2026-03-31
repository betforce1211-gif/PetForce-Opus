import { ScrollView, Alert, Pressable } from "react-native";
import { YStack, XStack, Text, Input, TextArea, Spinner } from "tamagui";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Card } from "@petforce/ui";
import { trpc } from "../../lib/trpc";
import { useHousehold } from "../../lib/household";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ICONS } from "@petforce/core";
import type { ActivityType } from "@petforce/core";

const ACTIVITY_TYPES: ActivityType[] = ["walk", "feeding", "vet_visit", "medication", "grooming", "play", "other"];

export default function NewActivityScreen() {
  const router = useRouter();
  const { householdId } = useHousehold();
  const [selectedType, setSelectedType] = useState<ActivityType>("walk");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);

  const petsQuery = trpc.pet.listByHousehold.useQuery(
    { householdId: householdId!, limit: 50, offset: 0 },
    { enabled: !!householdId }
  );

  const utils = trpc.useUtils();
  const createMutation = trpc.activity.create.useMutation({
    onSuccess: () => {
      utils.activity.listByHousehold.invalidate();
      utils.dashboard.get.invalidate();
      router.back();
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const pets = petsQuery.data?.items ?? [];

  const handleSubmit = () => {
    if (!householdId || !selectedPetId || !title.trim()) {
      Alert.alert("Missing info", "Please select a pet and enter a title.");
      return;
    }
    createMutation.mutate({
      householdId,
      petId: selectedPetId,
      type: selectedType,
      title: title.trim(),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <YStack padding="$4" gap="$4">
        {/* Activity type selector */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Type</Text>
          <XStack flexWrap="wrap" gap="$2">
            {ACTIVITY_TYPES.map((type) => (
              <Pressable key={type} onPress={() => setSelectedType(type)}>
                <Card
                  padding="$2"
                  paddingHorizontal="$3"
                  borderWidth={2}
                  borderColor={selectedType === type ? "$petforcePrimary" : "$pfBorder"}
                >
                  <Text>
                    {ACTIVITY_TYPE_ICONS[type]} {ACTIVITY_TYPE_LABELS[type]}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </XStack>
        </YStack>

        {/* Pet selector */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Pet</Text>
          {petsQuery.isLoading ? (
            <Spinner size="small" color="$petforcePrimary" />
          ) : (
            <XStack flexWrap="wrap" gap="$2">
              {pets.map((pet) => (
                <Pressable key={pet.id} onPress={() => setSelectedPetId(pet.id)}>
                  <Card
                    padding="$2"
                    paddingHorizontal="$3"
                    borderWidth={2}
                    borderColor={selectedPetId === pet.id ? "$petforcePrimary" : "$pfBorder"}
                  >
                    <Text>{pet.name}</Text>
                  </Card>
                </Pressable>
              ))}
            </XStack>
          )}
        </YStack>

        {/* Title */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Title</Text>
          <Input
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Morning walk"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* Notes */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Notes (optional)</Text>
          <TextArea
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional details..."
            borderColor="$pfBorder"
            numberOfLines={3}
          />
        </YStack>

        {/* Submit */}
        <Pressable onPress={handleSubmit}>
          <Card
            backgroundColor="$petforcePrimary"
            padding="$3"
            alignItems="center"
          >
            {createMutation.isPending ? (
              <Spinner size="small" color="white" />
            ) : (
              <Text color="white" fontWeight="bold" fontSize="$4">Log Activity</Text>
            )}
          </Card>
        </Pressable>
      </YStack>
    </ScrollView>
  );
}
