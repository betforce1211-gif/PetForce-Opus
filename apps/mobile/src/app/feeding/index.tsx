import { ScrollView, Alert, Pressable } from "react-native";
import { YStack, XStack, Text, Spinner } from "tamagui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Card, EmptyState } from "@petforce/ui";
import { trpc } from "../../lib/trpc";
import { useHousehold } from "../../lib/household";

export default function FeedingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ petId?: string; householdId?: string }>();
  const { householdId: contextHouseholdId } = useHousehold();
  const householdId = params.householdId ?? contextHouseholdId;

  const today = new Date().toISOString().slice(0, 10);

  const statusQuery = trpc.feeding.todayStatus.useQuery(
    { householdId: householdId!, date: today },
    { enabled: !!householdId }
  );

  const utils = trpc.useUtils();
  const logMutation = trpc.feeding.logCompletion.useMutation({
    onSuccess: () => {
      utils.feeding.todayStatus.invalidate();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const snoozeMutation = trpc.feeding.snooze.useMutation({
    onSuccess: () => {
      utils.feeding.todayStatus.invalidate();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  if (!householdId) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <EmptyState icon="🏠" title="No Household" description="Select a household first." />
      </YStack>
    );
  }

  if (statusQuery.isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" color="$petforcePrimary" />
      </YStack>
    );
  }

  const data = statusQuery.data;
  if (!data) return null;

  // Filter by petId if provided
  const pets = params.petId
    ? data.pets.filter((p) => p.petId === params.petId)
    : data.pets;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <YStack padding="$4" gap="$4">
        {/* Summary */}
        <Card padding="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontWeight="bold">Today's Feedings</Text>
            <XStack gap="$3" alignItems="center">
              <Text color="$petforceTextMuted">
                {data.totalCompleted}/{data.totalScheduled} done
              </Text>
              <Pressable onPress={() => router.push("/feeding/new")}>
                <Card backgroundColor="$petforcePrimary" padding="$1" paddingHorizontal="$2">
                  <Text color="white" fontSize="$2" fontWeight="bold">+ Add</Text>
                </Card>
              </Pressable>
            </XStack>
          </XStack>
        </Card>

        {pets.length === 0 && (
          <EmptyState icon="🍽️" title="No feeding schedules" description="Tap + Add above to set up feeding schedules." />
        )}

        {pets.map((petStatus) => (
          <Card key={petStatus.petId} padding="$4">
            <Text fontSize="$5" fontWeight="bold" marginBottom="$2">{petStatus.petName}</Text>
            <YStack gap="$3">
              {petStatus.schedules.map((schedule) => {
                const isDone = !!schedule.log && !schedule.log.skipped;
                const isSnoozed = !!schedule.snooze;

                return (
                  <YStack key={schedule.schedule.id} gap="$1">
                    <XStack justifyContent="space-between" alignItems="center">
                      <YStack>
                        <Text fontWeight="bold">
                          {schedule.schedule.label} — {schedule.schedule.time}
                        </Text>
                        {schedule.schedule.foodType && (
                          <Text fontSize="$2" color="$petforceTextMuted">
                            {schedule.schedule.foodType}
                            {schedule.schedule.amount ? ` · ${schedule.schedule.amount}` : ""}
                          </Text>
                        )}
                      </YStack>
                      <XStack gap="$2">
                        {isDone && !schedule.log?.skipped ? (
                          <Text color="green" fontWeight="bold">Done</Text>
                        ) : isDone && schedule.log?.skipped ? (
                          <Text color="$petforceTextMuted" fontWeight="bold">Skipped</Text>
                        ) : isSnoozed ? (
                          <Text color="orange" fontWeight="bold">Snoozed</Text>
                        ) : (
                          <>
                            <Pressable
                              onPress={() =>
                                logMutation.mutate({
                                  householdId: householdId!,
                                  feedingScheduleId: schedule.schedule.id,
                                  feedingDate: today,
                                })
                              }
                            >
                              <Card
                                backgroundColor="$petforcePrimary"
                                padding="$1"
                                paddingHorizontal="$2"
                              >
                                <Text color="white" fontSize="$2">Done</Text>
                              </Card>
                            </Pressable>
                            <Pressable
                              onPress={() =>
                                logMutation.mutate({
                                  householdId: householdId!,
                                  feedingScheduleId: schedule.schedule.id,
                                  feedingDate: today,
                                  skipped: true,
                                })
                              }
                            >
                              <Card
                                padding="$1"
                                paddingHorizontal="$2"
                                borderWidth={1}
                                borderColor="$pfBorder"
                              >
                                <Text fontSize="$2" color="$petforceTextMuted">Skip</Text>
                              </Card>
                            </Pressable>
                            <Pressable
                              onPress={() =>
                                snoozeMutation.mutate({
                                  householdId: householdId!,
                                  feedingScheduleId: schedule.schedule.id,
                                  feedingDate: today,
                                  snoozeDurationMinutes: 120,
                                })
                              }
                            >
                              <Card
                                padding="$1"
                                paddingHorizontal="$2"
                              >
                                <Text fontSize="$2">Snooze</Text>
                              </Card>
                            </Pressable>
                          </>
                        )}
                      </XStack>
                    </XStack>
                  </YStack>
                );
              })}
            </YStack>
          </Card>
        ))}
      </YStack>
    </ScrollView>
  );
}
