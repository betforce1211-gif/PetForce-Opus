import { View, StyleSheet } from "react-native";
import { YStack, XStack, Text } from "tamagui";

interface BudgetProgressBarProps {
  label: string;
  spent: number;
  total: number;
  currency?: string;
}

function getBarColor(pct: number): string {
  if (pct >= 100) return "#EF4444"; // red
  if (pct >= 75) return "#F59E0B"; // yellow/amber
  return "#22C55E"; // green
}

export function BudgetProgressBar({
  label,
  spent,
  total,
  currency = "USD",
}: BudgetProgressBarProps) {
  const pct = total > 0 ? (spent / total) * 100 : 0;
  const clampedPct = Math.min(pct, 100);
  const color = getBarColor(pct);

  return (
    <YStack gap="$1">
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$3" fontWeight="600" color="$petforceText">
          {label}
        </Text>
        <Text fontSize="$2" color="$petforceTextMuted">
          ${spent.toFixed(0)} / ${total.toFixed(0)}
        </Text>
      </XStack>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${clampedPct}%` as unknown as number, backgroundColor: color },
          ]}
        />
      </View>
      {pct >= 100 && (
        <Text fontSize="$1" color="#EF4444" fontWeight="bold">
          Budget exceeded by ${(spent - total).toFixed(0)}
        </Text>
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
});
