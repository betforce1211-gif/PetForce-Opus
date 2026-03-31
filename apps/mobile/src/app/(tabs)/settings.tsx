import { ScrollView, Alert } from "react-native";
import { YStack, XStack, Text, Spinner, Input } from "tamagui";
import { useState } from "react";
import { Card, MemberRow, EmptyState } from "@petforce/ui";
import { trpc } from "../../lib/trpc";
import { useHousehold } from "../../lib/household";
import { MEMBER_ROLE_LABELS } from "@petforce/core";

export default function SettingsScreen() {
  const { householdId } = useHousehold();

  const dashboardQuery = trpc.dashboard.get.useQuery(
    { householdId: householdId! },
    { enabled: !!householdId }
  );

  if (!householdId) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <EmptyState icon="🏠" title="No Household" description="Select or create a household first." />
      </YStack>
    );
  }

  if (dashboardQuery.isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" color="$petforcePrimary" />
      </YStack>
    );
  }

  const { household, members } = dashboardQuery.data ?? { household: null, members: [] };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <YStack padding="$4" gap="$4">
        {/* Household info */}
        <Card padding="$4">
          <Text fontSize="$5" fontWeight="bold" marginBottom="$2">Household</Text>
          <YStack gap="$2">
            <Text color="$petforceTextMuted">Name</Text>
            <Text fontSize="$4">{household?.name ?? "—"}</Text>
          </YStack>
          {household?.joinCode && (
            <YStack gap="$2" marginTop="$3">
              <Text color="$petforceTextMuted">Join Code</Text>
              <Text fontSize="$4" fontFamily="$mono">{household.joinCode}</Text>
            </YStack>
          )}
        </Card>

        {/* Theme */}
        <Card padding="$4">
          <Text fontSize="$5" fontWeight="bold" marginBottom="$2">Theme</Text>
          <XStack gap="$3" alignItems="center">
            <YStack
              width={40}
              height={40}
              borderRadius={20}
              backgroundColor={household?.theme?.primaryColor ?? "#6366F1"}
            />
            <YStack
              width={40}
              height={40}
              borderRadius={20}
              backgroundColor={household?.theme?.secondaryColor ?? "#EC4899"}
            />
            <Text color="$petforceTextMuted">Primary & Secondary</Text>
          </XStack>
        </Card>

        {/* Members */}
        <Card padding="$4">
          <Text fontSize="$5" fontWeight="bold" marginBottom="$2">
            Members ({members.length})
          </Text>
          <YStack gap="$2">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                displayName={member.displayName ?? "Unknown"}
                role={member.role}
              />
            ))}
          </YStack>
        </Card>

        {/* Pending invites/requests */}
        {dashboardQuery.data && (
          (dashboardQuery.data.pendingInviteCount > 0 || dashboardQuery.data.pendingRequestCount > 0) && (
            <Card padding="$4">
              <Text fontSize="$5" fontWeight="bold" marginBottom="$2">Pending</Text>
              {dashboardQuery.data.pendingInviteCount > 0 && (
                <Text color="$petforceTextMuted">
                  {dashboardQuery.data.pendingInviteCount} pending invite(s)
                </Text>
              )}
              {dashboardQuery.data.pendingRequestCount > 0 && (
                <Text color="$petforceTextMuted">
                  {dashboardQuery.data.pendingRequestCount} pending request(s)
                </Text>
              )}
            </Card>
          )
        )}
      </YStack>
    </ScrollView>
  );
}
