import { ScrollView, Pressable } from "react-native";
import { YStack, XStack, Text, Spinner } from "tamagui";
import { useRouter } from "expo-router";
import { Card, EmptyState } from "@petforce/ui";
import { trpc } from "../../lib/trpc";
import { useHousehold } from "../../lib/household";

export default function VaccinationTrackerScreen() {
  const router = useRouter();
  const { householdId } = useHousehold();

  const recordsQuery = trpc.health.listRecords.useQuery(
    { householdId: householdId!, limit: 200, offset: 0 },
    { enabled: !!householdId }
  );

  const petsQuery = trpc.pet.listByHousehold.useQuery(
    { householdId: householdId!, limit: 50, offset: 0 },
    { enabled: !!householdId }
  );

  if (!householdId) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <EmptyState icon="🏠" title="No Household" description="Select a household first." />
      </YStack>
    );
  }

  if (recordsQuery.isLoading || petsQuery.isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" color="$petforcePrimary" />
      </YStack>
    );
  }

  const allRecords = recordsQuery.data?.items ?? [];
  const vaccinations = allRecords.filter((r) => r.type === "vaccination");
  const pets = petsQuery.data?.items ?? [];
  const petMap = new Map(pets.map((p) => [p.id, p.name]));

  const now = new Date();

  // Separate overdue vs upcoming vs past (no next due)
  const overdue: typeof vaccinations = [];
  const upcoming: typeof vaccinations = [];
  const completed: typeof vaccinations = [];

  for (const vax of vaccinations) {
    if (vax.nextDueDate) {
      const dueDate = new Date(vax.nextDueDate);
      if (dueDate < now) {
        overdue.push(vax);
      } else {
        upcoming.push(vax);
      }
    } else {
      completed.push(vax);
    }
  }

  // Sort overdue by how long overdue (most overdue first)
  overdue.sort((a, b) => new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime());
  // Sort upcoming by soonest first
  upcoming.sort((a, b) => new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime());

  const daysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <YStack padding="$4" gap="$4">
        {/* Add button */}
        <Pressable onPress={() => router.push("/health/new?type=vaccination")}>
          <Card
            borderWidth={2}
            borderColor="$petforcePrimary"
            padding="$3"
            alignItems="center"
          >
            <Text color="$petforcePrimary" fontWeight="bold">+ Record Vaccination</Text>
          </Card>
        </Pressable>

        {vaccinations.length === 0 && (
          <EmptyState
            icon="💉"
            title="No vaccinations recorded"
            description="Track your pets' vaccinations to stay on top of their health."
          />
        )}

        {/* Overdue section */}
        {overdue.length > 0 && (
          <YStack gap="$2">
            <XStack gap="$2" alignItems="center">
              <Text fontSize="$5" fontWeight="bold" color="red">Overdue</Text>
              <Card backgroundColor="red" paddingHorizontal="$2" padding="$1" borderRadius={12}>
                <Text color="white" fontSize="$2" fontWeight="bold">{overdue.length}</Text>
              </Card>
            </XStack>
            {overdue.map((vax) => (
              <Card key={vax.id} padding="$4" borderLeftWidth={4} borderLeftColor="red">
                <XStack justifyContent="space-between" alignItems="flex-start">
                  <YStack flex={1}>
                    <Text fontWeight="bold">{vax.vaccineName || "Vaccination"}</Text>
                    <Text color="$petforceTextMuted">{petMap.get(vax.petId) ?? "Unknown pet"}</Text>
                    {vax.vetOrClinic && (
                      <Text fontSize="$2" color="$petforceTextMuted">{vax.vetOrClinic}</Text>
                    )}
                  </YStack>
                  <YStack alignItems="flex-end">
                    <Text color="red" fontWeight="bold" fontSize="$2">
                      {Math.abs(daysUntil(vax.nextDueDate!))} days overdue
                    </Text>
                    <Text fontSize="$1" color="$petforceTextMuted">
                      Due: {new Date(vax.nextDueDate!).toLocaleDateString()}
                    </Text>
                  </YStack>
                </XStack>
              </Card>
            ))}
          </YStack>
        )}

        {/* Upcoming section */}
        {upcoming.length > 0 && (
          <YStack gap="$2">
            <Text fontSize="$5" fontWeight="bold">Upcoming</Text>
            {upcoming.map((vax) => {
              const days = daysUntil(vax.nextDueDate!);
              const isWarning = days <= 30;
              return (
                <Card
                  key={vax.id}
                  padding="$4"
                  borderLeftWidth={4}
                  borderLeftColor={isWarning ? "orange" : "$petforcePrimary"}
                >
                  <XStack justifyContent="space-between" alignItems="flex-start">
                    <YStack flex={1}>
                      <Text fontWeight="bold">{vax.vaccineName || "Vaccination"}</Text>
                      <Text color="$petforceTextMuted">{petMap.get(vax.petId) ?? "Unknown pet"}</Text>
                    </YStack>
                    <YStack alignItems="flex-end">
                      <Text
                        color={isWarning ? "orange" : "$petforceTextMuted"}
                        fontWeight="bold"
                        fontSize="$2"
                      >
                        {days === 0 ? "Due today" : `In ${days} days`}
                      </Text>
                      <Text fontSize="$1" color="$petforceTextMuted">
                        {new Date(vax.nextDueDate!).toLocaleDateString()}
                      </Text>
                    </YStack>
                  </XStack>
                </Card>
              );
            })}
          </YStack>
        )}

        {/* Completed (no next due) */}
        {completed.length > 0 && (
          <YStack gap="$2">
            <Text fontSize="$5" fontWeight="bold" color="$petforceTextMuted">Past Vaccinations</Text>
            {completed.map((vax) => (
              <Card key={vax.id} padding="$4">
                <XStack justifyContent="space-between" alignItems="flex-start">
                  <YStack flex={1}>
                    <Text fontWeight="bold">{vax.vaccineName || "Vaccination"}</Text>
                    <Text color="$petforceTextMuted">{petMap.get(vax.petId) ?? "Unknown pet"}</Text>
                  </YStack>
                  <Text fontSize="$2" color="$petforceTextMuted">
                    {new Date(vax.date).toLocaleDateString()}
                  </Text>
                </XStack>
              </Card>
            ))}
          </YStack>
        )}
      </YStack>
    </ScrollView>
  );
}
