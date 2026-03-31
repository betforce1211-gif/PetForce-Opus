import { ScrollView, Alert, Pressable } from "react-native";
import { YStack, Text, Input, TextArea, Spinner } from "tamagui";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Card } from "@petforce/ui";
import { trpc } from "../../lib/trpc";
import { useHousehold } from "../../lib/household";
import { XStack } from "tamagui";

export default function NewMedicationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ petId?: string }>();
  const { householdId } = useHousehold();

  const petsQuery = trpc.pet.listByHousehold.useQuery(
    { householdId: householdId!, limit: 50, offset: 0 },
    { enabled: !!householdId }
  );

  const [petId, setPetId] = useState(params.petId ?? "");
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [prescribedBy, setPrescribedBy] = useState("");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();
  const createMutation = trpc.health.createMedication.useMutation({
    onSuccess: () => {
      utils.health.listMedications.invalidate();
      utils.health.todayMedicationStatus.invalidate();
      utils.health.summary.invalidate();
      router.back();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handleSubmit = () => {
    if (!householdId || !petId || !name.trim()) {
      Alert.alert("Missing info", "Please select a pet and enter a medication name.");
      return;
    }
    createMutation.mutate({
      householdId: householdId!,
      petId,
      name: name.trim(),
      dosage: dosage.trim() || null,
      frequency: frequency.trim() || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      prescribedBy: prescribedBy.trim() || null,
      notes: notes.trim() || null,
    });
  };

  const pets = petsQuery.data?.items ?? [];
  const FREQUENCY_OPTIONS = ["Once daily", "Twice daily", "Every 8 hours", "Weekly", "As needed"];

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

        {/* Medication Name */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Medication Name *</Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="e.g. Apoquel, Heartgard"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* Dosage */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Dosage</Text>
          <Input
            value={dosage}
            onChangeText={setDosage}
            placeholder="e.g. 16mg, 1 tablet"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* Frequency */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Frequency</Text>
          <XStack flexWrap="wrap" gap="$2">
            {FREQUENCY_OPTIONS.map((f) => (
              <Pressable key={f} onPress={() => setFrequency(f)}>
                <Card
                  padding="$2"
                  paddingHorizontal="$3"
                  borderWidth={2}
                  borderColor={frequency === f ? "$petforcePrimary" : "$pfBorder"}
                >
                  <Text fontSize="$2">{f}</Text>
                </Card>
              </Pressable>
            ))}
          </XStack>
          <Input
            value={frequency}
            onChangeText={setFrequency}
            placeholder="Or type custom frequency"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* Start Date */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Start Date (YYYY-MM-DD)</Text>
          <Input
            value={startDate}
            onChangeText={setStartDate}
            placeholder="2026-03-30"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* End Date */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">End Date (YYYY-MM-DD)</Text>
          <Input
            value={endDate}
            onChangeText={setEndDate}
            placeholder="Leave blank if ongoing"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* Prescribed By */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Prescribed By</Text>
          <Input
            value={prescribedBy}
            onChangeText={setPrescribedBy}
            placeholder="e.g. Dr. Smith"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* Notes */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Notes</Text>
          <TextArea
            value={notes}
            onChangeText={setNotes}
            placeholder="Special instructions, side effects to watch for..."
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
              <Text color="white" fontWeight="bold" fontSize="$4">Add Medication</Text>
            )}
          </Card>
        </Pressable>
      </YStack>
    </ScrollView>
  );
}
