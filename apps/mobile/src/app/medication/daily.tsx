import { ScrollView, Alert, Pressable } from "react-native";
import { YStack, XStack, Text, Spinner } from "tamagui";
import { useRouter } from "expo-router";
import { Card, EmptyState } from "@petforce/ui";
import { trpc } from "../../lib/trpc";
import { useHousehold } from "../../lib/household";
import { useXpReward } from "../../hooks/useXpReward";
import { XpToast } from "../../components/XpToast";
import { LevelUpModal } from "../../components/LevelUpModal";
import { BadgeUnlockOverlay } from "../../components/BadgeUnlockOverlay";

export default function MedicationDailyScreen() {
  const router = useRouter();
  const { householdId } = useHousehold();
  const today = new Date().toISOString().slice(0, 10);
  const xpReward = useXpReward();

  const statusQuery = trpc.health.todayMedicationStatus.useQuery(
    { householdId: householdId!, date: today },
    { enabled: !!householdId }
  );

  const utils = trpc.useUtils();
  const logMutation = trpc.health.logMedicationCompletion.useMutation({
    onSuccess: (data) => {
      utils.health.todayMedicationStatus.invalidate();
      utils.health.listMedications.invalidate();
      if (data && "xpAwarded" in data && (data as { xpAwarded: number }).xpAwarded > 0) {
        xpReward.handleXpReward(data as { xpAwarded: number; newLevel: number; newBadges: string[] });
      }
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const snoozeMutation = trpc.health.snoozeMedication.useMutation({
    onSuccess: () => {
      utils.health.todayMedicationStatus.invalidate();
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

  return (
    <>
    <XpToast xp={xpReward.xpToast?.xp ?? 0} visible={!!xpReward.xpToast} onDismiss={xpReward.dismissXpToast} />
    <LevelUpModal level={xpReward.levelUp?.level ?? 0} visible={!!xpReward.levelUp} onDismiss={xpReward.dismissLevelUp} />
    <BadgeUnlockOverlay badgeIds={xpReward.badgeUnlock?.badgeIds ?? []} visible={!!xpReward.badgeUnlock} onDismiss={xpReward.dismissBadgeUnlock} />
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <YStack padding="$4" gap="$4">
        {/* Summary */}
        <Card padding="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontWeight="bold">Today's Medications</Text>
            <XStack gap="$3" alignItems="center">
              <Text color="$petforceTextMuted">
                {data.totalLogged}/{data.totalActive} done
              </Text>
              <Pressable onPress={() => router.push("/medication/new")}>
                <Card backgroundColor="$petforcePrimary" padding="$1" paddingHorizontal="$2">
                  <Text color="white" fontSize="$2" fontWeight="bold">+ Add</Text>
                </Card>
              </Pressable>
            </XStack>
          </XStack>
        </Card>

        {data.medications.length === 0 ? (
          <EmptyState
            icon="💊"
            title="No active medications"
            description="Your pets' active medications will appear here."
          />
        ) : (
          data.medications.map((medStatus: any) => {
            const isDone = !!medStatus.log && !medStatus.log.skipped;
            const isSkipped = !!medStatus.log?.skipped;
            const isSnoozed = !!medStatus.snooze;

            return (
              <Card key={medStatus.medication.id} padding="$4">
                <XStack justifyContent="space-between" alignItems="flex-start">
                  <YStack flex={1}>
                    <Text fontWeight="bold" fontSize="$4">
                      {medStatus.medication.name}
                    </Text>
                    <Text color="$petforceTextMuted">{medStatus.petName}</Text>
                    {medStatus.medication.dosage && (
                      <Text fontSize="$2" color="$petforceTextMuted">
                        {medStatus.medication.dosage}
                        {medStatus.medication.frequency
                          ? ` · ${medStatus.medication.frequency}`
                          : ""}
                      </Text>
                    )}
                  </YStack>
                  <XStack gap="$2">
                    {isDone ? (
                      <Text color="green" fontWeight="bold">Done</Text>
                    ) : isSkipped ? (
                      <Text color="$petforceTextMuted" fontWeight="bold">Skipped</Text>
                    ) : isSnoozed ? (
                      <Text color="orange" fontWeight="bold">Snoozed</Text>
                    ) : (
                      <>
                        <Pressable
                          onPress={() =>
                            logMutation.mutate({
                              householdId: householdId!,
                              medicationId: medStatus.medication.id,
                              loggedDate: today,
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
                              medicationId: medStatus.medication.id,
                              loggedDate: today,
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
                              medicationId: medStatus.medication.id,
                              snoozeDate: today,
                              snoozeDurationMinutes: 30,
                            })
                          }
                        >
                          <Card padding="$1" paddingHorizontal="$2">
                            <Text fontSize="$2">Snooze</Text>
                          </Card>
                        </Pressable>
                      </>
                    )}
                  </XStack>
                </XStack>
              </Card>
            );
          })
        )}
      </YStack>
    </ScrollView>
    </>
  );
}
