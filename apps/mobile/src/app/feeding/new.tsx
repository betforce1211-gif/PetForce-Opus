import { ScrollView, Alert, Pressable } from "react-native";
import { YStack, XStack, Text, Input, TextArea, Spinner } from "tamagui";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Card } from "@petforce/ui";
import { trpc } from "../../lib/trpc";
import { useHousehold } from "../../lib/household";

const COMMON_LABELS = ["Breakfast", "Lunch", "Dinner", "Snack"];
const COMMON_TIMES: Record<string, string> = {
  Breakfast: "08:00",
  Lunch: "12:00",
  Dinner: "18:00",
  Snack: "15:00",
};

export default function NewFeedingScheduleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ petId?: string }>();
  const { householdId } = useHousehold();

  const petsQuery = trpc.pet.listByHousehold.useQuery(
    { householdId: householdId!, limit: 50, offset: 0 },
    { enabled: !!householdId }
  );

  const [petId, setPetId] = useState(params.petId ?? "");
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("");
  const [foodType, setFoodType] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();
  const createMutation = trpc.feeding.createSchedule.useMutation({
    onSuccess: () => {
      utils.feeding.todayStatus.invalidate();
      utils.feeding.listSchedules.invalidate();
      router.back();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handleLabelSelect = (selected: string) => {
    setLabel(selected);
    if (!time && COMMON_TIMES[selected]) {
      setTime(COMMON_TIMES[selected]);
    }
  };

  const handleSubmit = () => {
    if (!householdId || !petId || !label.trim() || !time.trim()) {
      Alert.alert("Missing info", "Please select a pet, enter a label, and set a time.");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      Alert.alert("Invalid time", "Time must be in HH:mm format (e.g. 08:00).");
      return;
    }
    createMutation.mutate({
      householdId: householdId!,
      petId,
      label: label.trim(),
      time,
      foodType: foodType.trim() || null,
      amount: amount.trim() || null,
      notes: notes.trim() || null,
    });
  };

  const pets = petsQuery.data?.items ?? [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <YStack padding="$4" gap="$4">
        {/* Pet selector */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Pet *</Text>
          <XStack flexWrap="wrap" gap="$2">
            {pets.map((pet) => (
              <Pressable key={pet.id} onPress={() => setPetId(pet.id)}>
                <Card
                  padding="$2"
                  paddingHorizontal="$3"
                  borderWidth={2}
                  borderColor={petId === pet.id ? "$petforcePrimary" : "$pfBorder"}
                >
                  <Text>{pet.name}</Text>
                </Card>
              </Pressable>
            ))}
          </XStack>
        </YStack>

        {/* Label with quick picks */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Label *</Text>
          <XStack flexWrap="wrap" gap="$2">
            {COMMON_LABELS.map((l) => (
              <Pressable key={l} onPress={() => handleLabelSelect(l)}>
                <Card
                  padding="$2"
                  paddingHorizontal="$3"
                  borderWidth={2}
                  borderColor={label === l ? "$petforcePrimary" : "$pfBorder"}
                >
                  <Text>{l}</Text>
                </Card>
              </Pressable>
            ))}
          </XStack>
          <Input
            value={label}
            onChangeText={setLabel}
            placeholder="Or type a custom label"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* Time */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Time * (HH:mm)</Text>
          <Input
            value={time}
            onChangeText={setTime}
            placeholder="e.g. 08:00"
            keyboardType="numbers-and-punctuation"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* Food Type */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Food Type</Text>
          <Input
            value={foodType}
            onChangeText={setFoodType}
            placeholder="e.g. Dry kibble, Wet food"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* Amount */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Amount</Text>
          <Input
            value={amount}
            onChangeText={setAmount}
            placeholder="e.g. 1 cup, 200g"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* Notes */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Notes</Text>
          <TextArea
            value={notes}
            onChangeText={setNotes}
            placeholder="Special instructions..."
            borderColor="$pfBorder"
            numberOfLines={3}
          />
        </YStack>

        {/* Submit */}
        <Pressable onPress={handleSubmit} disabled={createMutation.isPending}>
          <Card backgroundColor="$petforcePrimary" padding="$3" alignItems="center">
            {createMutation.isPending ? (
              <Spinner size="small" color="white" />
            ) : (
              <Text color="white" fontWeight="bold" fontSize="$4">Add Feeding Schedule</Text>
            )}
          </Card>
        </Pressable>
      </YStack>
    </ScrollView>
  );
}
