import { ScrollView } from "react-native";
import { YStack, XStack, Text, Spinner } from "tamagui";
import { useLocalSearchParams } from "expo-router";
import { Card, EmptyState } from "@petforce/ui";
import { trpc } from "../../lib/trpc";
import { useHousehold } from "../../lib/household";

export default function HealthRecordsScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { householdId } = useHousehold();

  const recordsQuery = trpc.health.listRecords.useQuery(
    { householdId: householdId!, limit: 100, offset: 0 },
    { enabled: !!householdId && !!petId }
  );

  if (!householdId) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <EmptyState icon="🏠" title="No Household" description="Select a household first." />
      </YStack>
    );
  }

  if (recordsQuery.isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" color="$petforcePrimary" />
      </YStack>
    );
  }

  const allRecords = recordsQuery.data?.items ?? [];
  const records = allRecords.filter((r) => r.petId === petId);

  const TYPE_ICONS: Record<string, string> = {
    vet_visit: "🏥",
    vaccination: "💉",
    checkup: "🩺",
    procedure: "⚕️",
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <YStack padding="$4" gap="$3">
        {records.length === 0 ? (
          <EmptyState icon="🏥" title="No health records" description="Health records will appear here." />
        ) : (
          records.map((record) => (
            <Card key={record.id} padding="$4">
              <XStack gap="$2" alignItems="center" marginBottom="$2">
                <Text fontSize={20}>{TYPE_ICONS[record.type] ?? "📋"}</Text>
                <Text fontSize="$4" fontWeight="bold" textTransform="capitalize">
                  {record.type.replace("_", " ")}
                </Text>
              </XStack>
              <YStack gap="$1">
                <DetailRow label="Date" value={new Date(record.date).toLocaleDateString()} />
                {record.vetOrClinic && <DetailRow label="Vet/Clinic" value={record.vetOrClinic} />}
                {record.reason && <DetailRow label="Reason" value={record.reason} />}
                {record.vaccineName && <DetailRow label="Vaccine" value={record.vaccineName} />}
                {record.nextDueDate && (
                  <DetailRow label="Next Due" value={new Date(record.nextDueDate).toLocaleDateString()} />
                )}
                {record.cost != null && <DetailRow label="Cost" value={`$${record.cost}`} />}
                {record.notes && (
                  <Text color="$petforceTextMuted" marginTop="$1">{record.notes}</Text>
                )}
              </YStack>
            </Card>
          ))
        )}
      </YStack>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <XStack justifyContent="space-between">
      <Text color="$petforceTextMuted">{label}</Text>
      <Text>{value}</Text>
    </XStack>
  );
}
