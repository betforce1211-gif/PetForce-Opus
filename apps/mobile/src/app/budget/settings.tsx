import { ScrollView, Alert, Pressable } from "react-native";
import { YStack, XStack, Text, Input, Spinner } from "tamagui";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Card, EmptyState } from "@petforce/ui";
import { trpc } from "../../lib/trpc";
import { useHousehold } from "../../lib/household";

export default function BudgetSettingsScreen() {
  const router = useRouter();
  const { householdId } = useHousehold();
  const [newAmount, setNewAmount] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);

  const budgetsQuery = trpc.finance.getBudgets.useQuery(
    { householdId: householdId!, petId: undefined },
    { enabled: !!householdId }
  );

  const petsQuery = trpc.pet.listByHousehold.useQuery(
    { householdId: householdId!, limit: 50, offset: 0 },
    { enabled: !!householdId }
  );

  const utils = trpc.useUtils();

  const createMutation = trpc.finance.setBudget.useMutation({
    onSuccess: () => {
      utils.finance.getBudgets.invalidate();
      utils.finance.getBudgetStatus.invalidate();
      setNewAmount("");
      setSelectedPetId(null);
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const deleteMutation = trpc.finance.deleteBudget.useMutation({
    onSuccess: () => {
      utils.finance.getBudgets.invalidate();
      utils.finance.getBudgetStatus.invalidate();
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

  const budgets = budgetsQuery.data ?? [];
  const pets = petsQuery.data?.items ?? [];

  const handleCreate = () => {
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid amount", "Enter a positive number.");
      return;
    }
    createMutation.mutate({
      householdId: householdId!,
      petId: selectedPetId,
      monthlyAmount: amount,
    });
  };

  const handleDelete = (budgetId: string) => {
    Alert.alert("Delete Budget", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate({ householdId: householdId!, id: budgetId }),
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <YStack padding="$4" gap="$4">
        <Text fontSize="$6" fontWeight="bold">Budget Settings</Text>

        {/* New budget form */}
        <Card padding="$4">
          <Text fontSize="$4" fontWeight="bold" marginBottom="$3">Add Budget</Text>

          {/* Scope selector */}
          <YStack gap="$2" marginBottom="$3">
            <Text fontSize="$3" fontWeight="600">Scope</Text>
            <XStack flexWrap="wrap" gap="$2">
              <Pressable onPress={() => setSelectedPetId(null)}>
                <Card
                  padding="$2"
                  paddingHorizontal="$3"
                  borderWidth={2}
                  borderColor={selectedPetId === null ? "$petforcePrimary" : "$pfBorder"}
                >
                  <Text>Household</Text>
                </Card>
              </Pressable>
              {pets.map((pet) => (
                <Pressable key={pet.id} onPress={() => setSelectedPetId(pet.id)}>
                  <Card
                    padding="$2"
                    paddingHorizontal="$3"
                    borderWidth={2}
                    borderColor={selectedPetId === pet.id ? "$petforcePrimary" : "$pfBorder"}
                  >
                    <Text>{pet.name}</Text>
                  </Card>
                </Pressable>
              ))}
            </XStack>
          </YStack>

          {/* Amount */}
          <YStack gap="$2" marginBottom="$3">
            <Text fontSize="$3" fontWeight="600">Monthly Amount ($)</Text>
            <Input
              value={newAmount}
              onChangeText={setNewAmount}
              placeholder="e.g. 200"
              keyboardType="decimal-pad"
              borderColor="$pfBorder"
            />
          </YStack>

          <Pressable onPress={handleCreate}>
            <Card backgroundColor="$petforcePrimary" padding="$3" alignItems="center">
              {createMutation.isPending ? (
                <Spinner size="small" color="white" />
              ) : (
                <Text color="white" fontWeight="bold" fontSize="$4">Set Budget</Text>
              )}
            </Card>
          </Pressable>
        </Card>

        {/* Existing budgets */}
        <Text fontSize="$4" fontWeight="bold">Current Budgets</Text>
        {budgetsQuery.isLoading ? (
          <Spinner size="large" color="$petforcePrimary" />
        ) : budgets.length === 0 ? (
          <EmptyState icon="💰" title="No budgets" description="Create your first budget above." />
        ) : (
          budgets.map((budget) => {
            const petName = budget.petId
              ? pets.find((p) => p.id === budget.petId)?.name ?? "Pet"
              : "Household";
            return (
              <Card key={budget.id} padding="$4">
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack>
                    <Text fontSize="$4" fontWeight="bold">{petName}</Text>
                    <Text fontSize="$3" color="$petforceTextMuted">
                      ${budget.monthlyAmount}/month
                    </Text>
                  </YStack>
                  <Pressable onPress={() => handleDelete(budget.id)}>
                    <Text color="red" fontSize="$3" fontWeight="600">Delete</Text>
                  </Pressable>
                </XStack>
              </Card>
            );
          })
        )}
      </YStack>
    </ScrollView>
  );
}
