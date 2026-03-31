import { ScrollView, Pressable } from "react-native";
import { YStack, XStack, Text, Spinner } from "tamagui";
import { useRouter } from "expo-router";
import { ActivityFeedItem, EmptyState, Card } from "@petforce/ui";
import { trpc } from "../../lib/trpc";
import { useHousehold } from "../../lib/household";

export default function ActivityScreen() {
  const router = useRouter();
  const { householdId } = useHousehold();

  const activitiesQuery = trpc.activity.listByHousehold.useQuery(
    { householdId: householdId!, limit: 50, offset: 0 },
    { enabled: !!householdId }
  );

  if (!householdId) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <EmptyState icon="🏠" title="No Household" description="Select or create a household first." />
      </YStack>
    );
  }

  if (activitiesQuery.isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" color="$petforcePrimary" />
      </YStack>
    );
  }

  const activities = activitiesQuery.data?.items ?? [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <YStack padding="$4" gap="$3">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$6" fontWeight="bold">Activity Log</Text>
          <Pressable onPress={() => router.push("/activity/new")}>
            <Card padding="$2" paddingHorizontal="$3">
              <Text fontWeight="bold" color="$petforcePrimary">+ Log Activity</Text>
            </Card>
          </Pressable>
        </XStack>

        {activities.length === 0 ? (
          <EmptyState icon="📋" title="No activities" description="Log your first pet activity!" />
        ) : (
          activities.map((activity) => (
            <ActivityFeedItem
              key={activity.id}
              type={activity.type}
              title={activity.title}
              createdAt={activity.createdAt}
            />
          ))
        )}
      </YStack>
    </ScrollView>
  );
}
