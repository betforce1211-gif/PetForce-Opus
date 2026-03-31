import { ScrollView, Alert, Pressable } from "react-native";
import { YStack, XStack, Text, Spinner } from "tamagui";
import { useLocalSearchParams } from "expo-router";
import { Card, EmptyState } from "@petforce/ui";
import { trpc } from "../../lib/trpc";
import { useHousehold } from "../../lib/household";

export default function MedicationScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { householdId } = useHousehold();

  const today = new Date().toISOString().slice(0, 10);

  const medsQuery = trpc.health.listMedications.useQuery(
    { householdId: householdId!, limit: 100, offset: 0 },
    { enabled: !!householdId && !!petId }
  );

  const utils = trpc.useUtils();
  const logMutation = trpc.health.logMedicationCompletion.useMutation({
    onSuccess: () => utils.health.listMedications.invalidate(),
    onError: (err) => Alert.alert("Error", err.message),
  });

  const snoozeMutation = trpc.health.snoozeMedication.useMutation({
    onSuccess: () => utils.health.listMedications.invalidate(),
    onError: (err) => Alert.alert("Error", err.message),
  });

  if (!householdId) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <EmptyState icon="🏠" title="No Household" description="Select a household first." />
      </YStack>
    );
  }

  if (medsQuery.isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" color="$petforcePrimary" />
      </YStack>
    );
  }

  const allMeds = medsQuery.data?.items ?? [];
  const medications = allMeds.filter((m) => m.petId === petId);
  const activeMeds = medications.filter((m) => m.isActive);
  const inactiveMeds = medications.filter((m) => !m.isActive);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <YStack padding="$4" gap="$4">
        {medications.length === 0 ? (
          <EmptyState icon="💊" title="No medications" description="Medications will appear here." />
        ) : (
          <>
            {activeMeds.length > 0 && (
              <YStack gap="$2">
                <Text fontSize="$5" fontWeight="bold">Active Medications</Text>
                {activeMeds.map((med) => (
                  <MedicationCard
                    key={med.id}
                    medication={med}
                    householdId={householdId!}
                    onLog={() =>
                      logMutation.mutate({
                        householdId: householdId!,
                        medicationId: med.id,
                        loggedDate: today,
                      })
                    }
                    onSnooze={() =>
                      snoozeMutation.mutate({
                        householdId: householdId!,
                        medicationId: med.id,
                        snoozeDate: today,
                        snoozeDurationMinutes: 30,
                      })
                    }
                  />
                ))}
              </YStack>
            )}

            {inactiveMeds.length > 0 && (
              <YStack gap="$2">
                <Text fontSize="$5" fontWeight="bold" color="$petforceTextMuted">Past Medications</Text>
                {inactiveMeds.map((med) => (
                  <MedicationCard key={med.id} medication={med} householdId={householdId!} />
                ))}
              </YStack>
            )}
          </>
        )}
      </YStack>
    </ScrollView>
  );
}

function MedicationCard({
  medication,
  householdId,
  onLog,
  onSnooze,
}: {
  medication: any;
  householdId: string;
  onLog?: () => void;
  onSnooze?: () => void;
}) {
  return (
    <Card padding="$4">
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack flex={1}>
          <Text fontSize="$4" fontWeight="bold">{medication.name}</Text>
          {medication.dosage && (
            <Text color="$petforceTextMuted">{medication.dosage}</Text>
          )}
          {medication.frequency && (
            <Text color="$petforceTextMuted">{medication.frequency}</Text>
          )}
          {medication.prescribedBy && (
            <Text fontSize="$2" color="$petforceTextMuted">
              Prescribed by: {medication.prescribedBy}
            </Text>
          )}
        </YStack>
        {medication.isActive && onLog && (
          <XStack gap="$2">
            <Pressable onPress={onLog}>
              <Card backgroundColor="$petforcePrimary" padding="$1" paddingHorizontal="$2">
                <Text color="white" fontSize="$2">Done</Text>
              </Card>
            </Pressable>
            {onSnooze && (
              <Pressable onPress={onSnooze}>
                <Card padding="$1" paddingHorizontal="$2">
                  <Text fontSize="$2">Snooze</Text>
                </Card>
              </Pressable>
            )}
          </XStack>
        )}
      </XStack>
    </Card>
  );
}
