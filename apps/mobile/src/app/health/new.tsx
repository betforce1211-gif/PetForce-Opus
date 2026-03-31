import { ScrollView, Alert, Pressable } from "react-native";
import { YStack, XStack, Text, Input, TextArea, Spinner } from "tamagui";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Card } from "@petforce/ui";
import { trpc } from "../../lib/trpc";
import { useHousehold } from "../../lib/household";
import { HEALTH_RECORD_TYPE_LABELS, HEALTH_RECORD_TYPE_ICONS } from "@petforce/core";
import type { HealthRecordType } from "@petforce/core";

const RECORD_TYPES: HealthRecordType[] = ["vet_visit", "vaccination", "checkup", "procedure"];

export default function NewHealthRecordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ petId?: string }>();
  const { householdId } = useHousehold();

  const petsQuery = trpc.pet.listByHousehold.useQuery(
    { householdId: householdId!, limit: 50, offset: 0 },
    { enabled: !!householdId }
  );

  const [petId, setPetId] = useState(params.petId ?? "");
  const [type, setType] = useState<HealthRecordType>("vet_visit");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [vetOrClinic, setVetOrClinic] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [cost, setCost] = useState("");
  const [vaccineName, setVaccineName] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");

  const utils = trpc.useUtils();
  const createMutation = trpc.health.createRecord.useMutation({
    onSuccess: () => {
      utils.health.listRecords.invalidate();
      utils.health.summary.invalidate();
      router.back();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handleSubmit = () => {
    if (!householdId || !petId || !date) {
      Alert.alert("Missing info", "Please select a pet and enter a date.");
      return;
    }
    createMutation.mutate({
      householdId: householdId!,
      petId,
      type,
      date: new Date(date),
      vetOrClinic: vetOrClinic.trim() || null,
      reason: reason.trim() || null,
      notes: notes.trim() || null,
      cost: cost ? parseFloat(cost) || null : null,
      vaccineName: vaccineName.trim() || null,
      nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
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

        {/* Record type */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Type *</Text>
          <XStack flexWrap="wrap" gap="$2">
            {RECORD_TYPES.map((t) => (
              <Pressable key={t} onPress={() => setType(t)}>
                <Card
                  padding="$2"
                  paddingHorizontal="$3"
                  borderWidth={2}
                  borderColor={type === t ? "$petforcePrimary" : "$pfBorder"}
                >
                  <Text>{HEALTH_RECORD_TYPE_ICONS[t]} {HEALTH_RECORD_TYPE_LABELS[t]}</Text>
                </Card>
              </Pressable>
            ))}
          </XStack>
        </YStack>

        {/* Date */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Date * (YYYY-MM-DD)</Text>
          <Input
            value={date}
            onChangeText={setDate}
            placeholder="2026-03-30"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* Vet/Clinic */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Vet / Clinic</Text>
          <Input
            value={vetOrClinic}
            onChangeText={setVetOrClinic}
            placeholder="e.g. Dr. Smith at PetCare Clinic"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* Reason */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Reason</Text>
          <Input
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Annual checkup, limping"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* Vaccination-specific fields */}
        {type === "vaccination" && (
          <>
            <YStack gap="$2">
              <Text fontSize="$4" fontWeight="bold">Vaccine Name</Text>
              <Input
                value={vaccineName}
                onChangeText={setVaccineName}
                placeholder="e.g. Rabies, DHPP, Bordetella"
                borderColor="$pfBorder"
              />
            </YStack>
            <YStack gap="$2">
              <Text fontSize="$4" fontWeight="bold">Next Due Date (YYYY-MM-DD)</Text>
              <Input
                value={nextDueDate}
                onChangeText={setNextDueDate}
                placeholder="e.g. 2027-03-30"
                borderColor="$pfBorder"
              />
            </YStack>
          </>
        )}

        {/* Cost */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Cost ($)</Text>
          <Input
            value={cost}
            onChangeText={setCost}
            placeholder="e.g. 150.00"
            keyboardType="decimal-pad"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* Notes */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Notes</Text>
          <TextArea
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional details..."
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
              <Text color="white" fontWeight="bold" fontSize="$4">Add Health Record</Text>
            )}
          </Card>
        </Pressable>
      </YStack>
    </ScrollView>
  );
}
