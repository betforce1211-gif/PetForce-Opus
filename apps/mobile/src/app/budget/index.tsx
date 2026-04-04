import { ScrollView, Pressable } from "react-native";
import { YStack, XStack, Text, Spinner } from "tamagui";
import { useRouter } from "expo-router";
import { Card, EmptyState } from "@petforce/ui";
import { trpc } from "../../lib/trpc";
import { useHousehold } from "../../lib/household";
import { BudgetProgressBar } from "../../components/BudgetProgressBar";
import { BudgetAlertBanner } from "../../components/BudgetAlertBanner";

export default function BudgetDashboardScreen() {
  const router = useRouter();
  const { householdId } = useHousehold();

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const budgetStatusQuery = trpc.finance.getBudgetStatus.useQuery(
    { householdId: householdId!, month: currentMonth },
    { enabled: !!householdId }
  );

  const summaryQuery = trpc.finance.summary.useQuery(
    { householdId: householdId!, month: currentMonth },
    { enabled: !!householdId }
  );

  if (!householdId) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <EmptyState icon="🏠" title="No Household" description="Select a household first." />
      </YStack>
    );
  }

  if (budgetStatusQuery.isLoading || summaryQuery.isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" color="$petforcePrimary" />
      </YStack>
    );
  }

  const statuses = budgetStatusQuery.data ?? [];
  const summary = summaryQuery.data;
  const alerts = statuses.filter(
    (s) => s.alertLevel === "warning" || s.alertLevel === "exceeded"
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <YStack padding="$4" gap="$4">
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$6" fontWeight="bold">Budget</Text>
          <Pressable onPress={() => router.push("/budget/settings")}>
            <Card padding="$2" paddingHorizontal="$3" backgroundColor="$petforcePrimary">
              <Text color="white" fontSize="$2" fontWeight="bold">Settings</Text>
            </Card>
          </Pressable>
        </XStack>

        {/* Monthly summary */}
        {summary && (
          <Card padding="$4">
            <Text fontSize="$2" color="$petforceTextMuted" marginBottom="$1">
              {currentMonth} Total Spending
            </Text>
            <Text fontSize="$8" fontWeight="bold" color="$petforceText">
              ${summary.monthlyTotal.toFixed(2)}
            </Text>
            {summary.previousMonthTotal != null && (
              <Text fontSize="$2" color="$petforceTextMuted" marginTop="$1">
                Last month: ${summary.previousMonthTotal.toFixed(2)}
              </Text>
            )}
          </Card>
        )}

        {/* Budget alerts */}
        {alerts.map((s) => (
          <BudgetAlertBanner
            key={s.budget.id}
            alertLevel={s.alertLevel as "warning" | "exceeded"}
            petName={s.petName}
            spent={s.spent}
            monthlyAmount={s.budget.monthlyAmount}
          />
        ))}

        {/* Budget progress bars */}
        {statuses.length > 0 ? (
          <Card padding="$4">
            <Text fontSize="$4" fontWeight="bold" marginBottom="$3">Budget Progress</Text>
            <YStack gap="$4">
              {statuses.map((s) => (
                <BudgetProgressBar
                  key={s.budget.id}
                  label={s.petName ?? "Household"}
                  spent={s.spent}
                  total={s.budget.monthlyAmount}
                />
              ))}
            </YStack>
          </Card>
        ) : (
          <EmptyState
            icon="💰"
            title="No budgets set"
            description="Set up monthly budgets for your household or individual pets."
          />
        )}

        {/* Per-category breakdown */}
        {summary?.byCategory && summary.byCategory.length > 0 && (
          <Card padding="$4">
            <Text fontSize="$4" fontWeight="bold" marginBottom="$3">By Category</Text>
            <YStack gap="$2">
              {[...summary.byCategory]
                .sort((a, b) => b.total - a.total)
                .map((item) => (
                  <XStack key={item.category} justifyContent="space-between">
                    <Text fontSize="$3" color="$petforceText" textTransform="capitalize">
                      {item.category}
                    </Text>
                    <Text fontSize="$3" fontWeight="600" color="$petforceText">
                      ${item.total.toFixed(2)}
                    </Text>
                  </XStack>
                ))}
            </YStack>
          </Card>
        )}

        {/* Per-pet breakdown */}
        {summary?.byPet && summary.byPet.length > 0 && (
          <Card padding="$4">
            <Text fontSize="$4" fontWeight="bold" marginBottom="$3">By Pet</Text>
            <YStack gap="$2">
              {[...summary.byPet]
                .sort((a, b) => b.total - a.total)
                .map((item) => (
                  <XStack key={item.petId} justifyContent="space-between">
                    <Text fontSize="$3" color="$petforceText">{item.petName}</Text>
                    <Text fontSize="$3" fontWeight="600" color="$petforceText">
                      ${item.total.toFixed(2)}
                    </Text>
                  </XStack>
                ))}
            </YStack>
          </Card>
        )}

        {/* Recent expenses */}
        {summary?.recentExpenses && summary.recentExpenses.length > 0 && (
          <Card padding="$4">
            <Text fontSize="$4" fontWeight="bold" marginBottom="$3">Recent Expenses</Text>
            <YStack gap="$2">
              {summary.recentExpenses.map((expense) => (
                <XStack key={expense.id} justifyContent="space-between" alignItems="center">
                  <YStack flex={1}>
                    <Text fontSize="$3" fontWeight="500" color="$petforceText">
                      {expense.description || expense.category}
                    </Text>
                    <Text fontSize="$1" color="$petforceTextMuted">
                      {new Date(expense.date).toLocaleDateString()}
                    </Text>
                  </YStack>
                  <Text fontSize="$3" fontWeight="600" color="$petforceText">
                    ${expense.amount.toFixed(2)}
                  </Text>
                </XStack>
              ))}
            </YStack>
          </Card>
        )}
      </YStack>
    </ScrollView>
  );
}
