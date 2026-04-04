import { XStack, Text } from "tamagui";
import { Card } from "@petforce/ui";

interface BudgetAlertBannerProps {
  alertLevel: "warning" | "exceeded";
  petName?: string | null;
  spent: number;
  monthlyAmount: number;
}

export function BudgetAlertBanner({
  alertLevel,
  petName,
  spent,
  monthlyAmount,
}: BudgetAlertBannerProps) {
  const isExceeded = alertLevel === "exceeded";
  const label = petName ? `${petName}'s budget` : "Household budget";
  const pct = monthlyAmount > 0 ? Math.round((spent / monthlyAmount) * 100) : 0;

  return (
    <Card
      backgroundColor={isExceeded ? "#FEE2E2" : "#FEF3C7"}
      borderColor={isExceeded ? "#EF4444" : "#F59E0B"}
      borderWidth={1}
      padding="$3"
    >
      <XStack alignItems="center" gap="$2">
        <Text fontSize="$4">{isExceeded ? "\u26A0\uFE0F" : "\u26A0\uFE0F"}</Text>
        <Text
          flex={1}
          fontSize="$3"
          fontWeight="600"
          color={isExceeded ? "#991B1B" : "#92400E"}
        >
          {label}: {pct}% used (${spent.toFixed(0)} of ${monthlyAmount.toFixed(0)})
        </Text>
      </XStack>
    </Card>
  );
}
