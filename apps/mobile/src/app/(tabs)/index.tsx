import { ScrollView, Pressable } from "react-native";
import { YStack, XStack, Text, Spinner } from "tamagui";
import { useRouter } from "expo-router";
import { Card, PetCard, ActivityFeedItem, HouseholdHeader, EmptyState } from "@petforce/ui";
import { trpc } from "../../lib/trpc";
import { useHousehold } from "../../lib/household";

export default function HomeScreen() {
  const router = useRouter();
  const { householdId, setHouseholdId } = useHousehold();
  const householdsQuery = trpc.dashboard.myHouseholds.useQuery();

  // Auto-select first household if none selected
  if (!householdId && householdsQuery.data?.length) {
    setHouseholdId(householdsQuery.data[0].id);
  }

  const dashboardQuery = trpc.dashboard.get.useQuery(
    { householdId: householdId! },
    { enabled: !!householdId }
  );

  const today = new Date().toISOString().slice(0, 10);
  const feedingStatus = trpc.feeding.todayStatus.useQuery(
    { householdId: householdId!, date: today },
    { enabled: !!householdId }
  );
  const medStatus = trpc.health.todayMedicationStatus.useQuery(
    { householdId: householdId!, date: today },
    { enabled: !!householdId }
  );
  const healthSummary = trpc.health.summary.useQuery(
    { householdId: householdId! },
    { enabled: !!householdId }
  );

  if (householdsQuery.isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" color="$petforcePrimary" />
      </YStack>
    );
  }

  if (!householdsQuery.data?.length) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <EmptyState
          icon="🏠"
          title="No Households"
          description="Create or join a household to get started."
        />
        <XStack gap="$3" marginTop="$4">
          <Pressable onPress={() => router.push("/onboard")}>
            <Card padding="$3">
              <Text fontWeight="bold" color="$petforcePrimary">Create Household</Text>
            </Card>
          </Pressable>
          <Pressable onPress={() => router.push("/join")}>
            <Card padding="$3">
              <Text fontWeight="bold" color="$petforcePrimary">Join Household</Text>
            </Card>
          </Pressable>
        </XStack>
      </YStack>
    );
  }

  const dashboard = dashboardQuery.data;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <YStack padding="$4" gap="$4">
        {dashboard?.household && (
          <HouseholdHeader
            name={dashboard.household.name}
            primaryColor={dashboard.household.theme?.primaryColor ?? "#6366F1"}
            petCount={dashboard.pets.length}
            memberCount={dashboard.members.length}
          />
        )}

        {/* Quick stats */}
        <XStack gap="$3">
          <Card flex={1} padding="$3">
            <Text fontSize="$2" color="$petforceTextMuted">Pets</Text>
            <Text fontSize="$7" fontWeight="bold">{dashboard?.pets.length ?? 0}</Text>
          </Card>
          <Card flex={1} padding="$3">
            <Text fontSize="$2" color="$petforceTextMuted">Members</Text>
            <Text fontSize="$7" fontWeight="bold">{dashboard?.members.length ?? 0}</Text>
          </Card>
          <Card flex={1} padding="$3">
            <Text fontSize="$2" color="$petforceTextMuted">Activities</Text>
            <Text fontSize="$7" fontWeight="bold">{dashboard?.recentActivities.length ?? 0}</Text>
          </Card>
        </XStack>

        {/* Today's care status */}
        <XStack gap="$3">
          <Pressable style={{ flex: 1 }} onPress={() => router.push("/feeding/index")}>
            <Card flex={1} padding="$3">
              <Text fontSize="$2" color="$petforceTextMuted">Feedings</Text>
              <Text fontSize="$6" fontWeight="bold">
                {feedingStatus.data
                  ? `${feedingStatus.data.totalCompleted}/${feedingStatus.data.totalScheduled}`
                  : "—"}
              </Text>
            </Card>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push("/medication/daily")}>
            <Card flex={1} padding="$3">
              <Text fontSize="$2" color="$petforceTextMuted">Medications</Text>
              <Text fontSize="$6" fontWeight="bold">
                {medStatus.data
                  ? `${medStatus.data.totalLogged}/${medStatus.data.totalActive}`
                  : "—"}
              </Text>
            </Card>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push("/health/vaccinations")}>
            <Card flex={1} padding="$3">
              <Text fontSize="$2" color="$petforceTextMuted">Overdue</Text>
              <Text
                fontSize="$6"
                fontWeight="bold"
                color={healthSummary.data?.overdueVaccinationCount ? "red" : undefined}
              >
                {healthSummary.data?.overdueVaccinationCount ?? "—"}
              </Text>
            </Card>
          </Pressable>
        </XStack>

        {/* Pets section */}
        <YStack gap="$2">
          <Text fontSize="$5" fontWeight="bold">Pets</Text>
          {dashboard?.pets.length === 0 && (
            <EmptyState icon="🐾" title="No pets yet" description="Add your first pet!" />
          )}
          {dashboard?.pets.map((pet) => (
            <Pressable key={pet.id} onPress={() => router.push(`/pet/${pet.id}`)}>
              <PetCard
                name={pet.name}
                species={pet.species}
                breed={pet.breed}
              />
            </Pressable>
          ))}
        </YStack>

        {/* Recent activity */}
        <YStack gap="$2">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$5" fontWeight="bold">Recent Activity</Text>
            <Text
              color="$petforcePrimary"
              onPress={() => router.push("/activity/new")}
            >
              + Log
            </Text>
          </XStack>
          {dashboard?.recentActivities.length === 0 && (
            <EmptyState icon="📋" title="No activity yet" description="Log your first activity!" />
          )}
          {dashboard?.recentActivities.slice(0, 5).map((activity) => (
            <ActivityFeedItem
              key={activity.id}
              type={activity.type}
              title={activity.title}
              createdAt={activity.createdAt}
            />
          ))}
        </YStack>
      </YStack>
    </ScrollView>
  );
}
