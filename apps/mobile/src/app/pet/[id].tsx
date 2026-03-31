import { ScrollView, Pressable } from "react-native";
import { YStack, XStack, Text, Spinner } from "tamagui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Card, EmptyState } from "@petforce/ui";
import { trpc } from "../../lib/trpc";
import { PET_SPECIES_LABELS, PET_SEX_LABELS, ACTIVITY_TYPE_LABELS } from "@petforce/core";

const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐕", cat: "🐱", bird: "🐦", fish: "🐟", reptile: "🦎", other: "🐾",
};

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const petQuery = trpc.pet.getById.useQuery({ id: id! }, { enabled: !!id });

  if (petQuery.isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" color="$petforcePrimary" />
      </YStack>
    );
  }

  if (!petQuery.data) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <EmptyState icon="🐾" title="Pet not found" description="This pet may have been removed." />
      </YStack>
    );
  }

  const pet = petQuery.data;
  const emoji = SPECIES_EMOJI[pet.species] ?? "🐾";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <YStack padding="$4" gap="$4">
        {/* Header */}
        <Card padding="$4" alignItems="center">
          <Text fontSize={64}>{emoji}</Text>
          <Text fontSize="$7" fontWeight="bold" marginTop="$2">{pet.name}</Text>
          <Text color="$petforceTextMuted" fontSize="$4">
            {PET_SPECIES_LABELS[pet.species]} {pet.breed ? `· ${pet.breed}` : ""}
          </Text>
        </Card>

        {/* Details */}
        <Card padding="$4">
          <Text fontSize="$5" fontWeight="bold" marginBottom="$3">Details</Text>
          <YStack gap="$2">
            <DetailRow label="Sex" value={pet.sex ? PET_SEX_LABELS[pet.sex] : "Unknown"} />
            {pet.color && <DetailRow label="Color" value={pet.color} />}
            {pet.dateOfBirth && (
              <DetailRow label="Date of Birth" value={new Date(pet.dateOfBirth).toLocaleDateString()} />
            )}
            {pet.weight && <DetailRow label="Weight" value={`${pet.weight}`} />}
            {pet.adoptionDate && (
              <DetailRow label="Adoption Date" value={new Date(pet.adoptionDate).toLocaleDateString()} />
            )}
            {pet.microchipNumber && <DetailRow label="Microchip" value={pet.microchipNumber} />}
            {pet.rabiesTagNumber && <DetailRow label="Rabies Tag" value={pet.rabiesTagNumber} />}
          </YStack>
        </Card>

        {/* Medical notes */}
        {pet.medicalNotes && (
          <Card padding="$4">
            <Text fontSize="$5" fontWeight="bold" marginBottom="$2">Medical Notes</Text>
            <Text color="$petforceTextMuted">{pet.medicalNotes}</Text>
          </Card>
        )}

        {/* Quick actions */}
        <XStack gap="$3">
          <Pressable style={{ flex: 1 }} onPress={() => router.push(`/feeding/index?petId=${pet.id}&householdId=${pet.householdId}`)}>
            <Card
              flex={1}
              padding="$3"
              alignItems="center"
            >
              <Text fontSize={24}>🍽️</Text>
              <Text fontSize="$2" fontWeight="bold" marginTop="$1">Feeding</Text>
            </Card>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push(`/health/${pet.id}`)}>
            <Card
              flex={1}
              padding="$3"
              alignItems="center"
            >
              <Text fontSize={24}>🏥</Text>
              <Text fontSize="$2" fontWeight="bold" marginTop="$1">Health</Text>
            </Card>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push(`/medication/${pet.id}`)}>
            <Card
              flex={1}
              padding="$3"
              alignItems="center"
            >
              <Text fontSize={24}>💊</Text>
              <Text fontSize="$2" fontWeight="bold" marginTop="$1">Meds</Text>
            </Card>
          </Pressable>
        </XStack>
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
