import { ScrollView, Alert, Pressable, Linking, Switch } from "react-native";
import { YStack, XStack, Text, Spinner, Button } from "tamagui";
import { useState } from "react";
import { useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Card, MemberRow, EmptyState } from "@petforce/ui";
import { trpc } from "../../lib/trpc";
import { useHousehold } from "../../lib/household";
import { usePushNotifications } from "../../lib/notifications";
import { MEMBER_ROLE_LABELS } from "@petforce/core";

export default function SettingsScreen() {
  const { householdId } = useHousehold();
  const { signOut } = useClerk();
  const router = useRouter();
  const { expoPushToken, permissionStatus, register, unregister } = usePushNotifications();

  const dashboardQuery = trpc.dashboard.get.useQuery(
    { householdId: householdId! },
    { enabled: !!householdId }
  );

  const prefsQuery = trpc.notification.getPreferences.useQuery(
    { householdId: householdId! },
    { enabled: !!householdId }
  );
  const utils = trpc.useUtils();
  const updatePrefsMutation = trpc.notification.updatePreferences.useMutation({
    onSuccess: () => utils.notification.getPreferences.invalidate(),
  });

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

        {/* Notifications */}
        <Card padding="$4">
          <Text fontSize="$5" fontWeight="bold" marginBottom="$2">Notifications</Text>
          <YStack gap="$2">
            <XStack justifyContent="space-between" alignItems="center">
              <Text color="$petforceTextMuted">Push Notifications</Text>
              <Text fontSize="$3" color={expoPushToken ? "#22C55E" : "$petforceTextMuted"}>
                {expoPushToken ? "Enabled" : "Disabled"}
              </Text>
            </XStack>
            {permissionStatus === "denied" ? (
              <Button
                size="$3"
                theme="active"
                onPress={() => Linking.openSettings()}
              >
                Open Settings to Enable
              </Button>
            ) : !expoPushToken ? (
              <Button
                size="$3"
                theme="active"
                onPress={register}
              >
                Enable Push Notifications
              </Button>
            ) : null}
          </YStack>
        </Card>

        {/* Notification Preferences */}
        {prefsQuery.data && (
          <Card padding="$4">
            <Text fontSize="$5" fontWeight="bold" marginBottom="$2">Notification Preferences</Text>
            <YStack gap="$3">
              {([
                { key: "streakAlerts" as const, label: "Streak Alerts", desc: "Warn when your streak is at risk" },
                { key: "budgetAlerts" as const, label: "Budget Alerts", desc: "Notify on budget warnings" },
                { key: "achievementAlerts" as const, label: "Achievement Alerts", desc: "Celebrate badge unlocks" },
                { key: "weeklyDigest" as const, label: "Weekly Digest", desc: "Weekly care summary email" },
              ]).map(({ key, label, desc }) => (
                <XStack key={key} justifyContent="space-between" alignItems="center">
                  <YStack flex={1}>
                    <Text fontSize="$3" fontWeight="600">{label}</Text>
                    <Text fontSize="$2" color="$petforceTextMuted">{desc}</Text>
                  </YStack>
                  <Switch
                    value={prefsQuery.data[key] ?? true}
                    onValueChange={(val) =>
                      updatePrefsMutation.mutate({
                        householdId: householdId!,
                        [key]: val,
                      })
                    }
                    trackColor={{ false: "#D1D5DB", true: "#6366F1" }}
                  />
                </XStack>
              ))}
            </YStack>
          </Card>
        )}

        {/* Budget Settings */}
        <Pressable onPress={() => router.push("/budget/settings")}>
          <Card padding="$4">
            <XStack justifyContent="space-between" alignItems="center">
              <YStack>
                <Text fontSize="$5" fontWeight="bold">Budget</Text>
                <Text fontSize="$2" color="$petforceTextMuted">Manage monthly budgets</Text>
              </YStack>
              <Text fontSize="$4" color="$petforceTextMuted">{">"}</Text>
            </XStack>
          </Card>
        </Pressable>

        {/* Sign out */}
        <Pressable
          onPress={() => {
            Alert.alert("Sign Out", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign Out",
                style: "destructive",
                onPress: async () => {
                  await unregister();
                  await signOut();
                  router.replace("/auth/sign-in");
                },
              },
            ]);
          }}
        >
          <Card padding="$4" alignItems="center">
            <Text color="red" fontWeight="bold" fontSize="$4">Sign Out</Text>
          </Card>
        </Pressable>
      </YStack>
    </ScrollView>
  );
}
