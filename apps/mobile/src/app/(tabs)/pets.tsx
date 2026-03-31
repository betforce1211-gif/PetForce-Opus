import { ScrollView, Pressable } from "react-native";
import { YStack, Text, Spinner } from "tamagui";
import { useRouter } from "expo-router";
import { PetCard, EmptyState } from "@petforce/ui";
import { trpc } from "../../lib/trpc";
import { useHousehold } from "../../lib/household";

export default function PetsScreen() {
  const router = useRouter();
  const { householdId } = useHousehold();

  const petsQuery = trpc.pet.listByHousehold.useQuery(
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

  if (petsQuery.isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" color="$petforcePrimary" />
      </YStack>
    );
  }

  const pets = petsQuery.data?.items ?? [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <YStack padding="$4" gap="$3">
        {pets.length === 0 ? (
          <EmptyState icon="🐾" title="No pets yet" description="Add your first pet to get started!" />
        ) : (
          pets.map((pet) => (
            <Pressable key={pet.id} onPress={() => router.push(`/pet/${pet.id}`)}>
              <PetCard
                name={pet.name}
                species={pet.species}
                breed={pet.breed}
              />
            </Pressable>
          ))
        )}
      </YStack>
    </ScrollView>
  );
}
