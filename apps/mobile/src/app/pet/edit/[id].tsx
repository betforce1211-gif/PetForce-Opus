import { ScrollView, Alert, Pressable } from "react-native";
import { YStack, XStack, Text, Input, TextArea, Spinner } from "tamagui";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Card, EmptyState } from "@petforce/ui";
import { trpc } from "@/lib/trpc";
import { PET_SPECIES_LABELS, PET_SEX_LABELS } from "@petforce/core";
import type { PetSpecies, PetSex } from "@petforce/core";

const SPECIES_OPTIONS: PetSpecies[] = ["dog", "cat", "bird", "fish", "reptile", "other"];
const SEX_OPTIONS: PetSex[] = ["male", "female", "unknown"];

const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐕", cat: "🐱", bird: "🐦", fish: "🐟", reptile: "🦎", other: "🐾",
};

export default function EditPetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const petQuery = trpc.pet.getById.useQuery({ id: id! }, { enabled: !!id });

  const [name, setName] = useState("");
  const [species, setSpecies] = useState<PetSpecies>("dog");
  const [breed, setBreed] = useState("");
  const [color, setColor] = useState("");
  const [sex, setSex] = useState<PetSex | null>(null);
  const [weight, setWeight] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (petQuery.data && !loaded) {
      const pet = petQuery.data;
      setName(pet.name);
      setSpecies(pet.species as PetSpecies);
      setBreed(pet.breed ?? "");
      setColor(pet.color ?? "");
      setSex((pet.sex as PetSex) ?? null);
      setWeight(pet.weight ? String(pet.weight) : "");
      setMedicalNotes(pet.medicalNotes ?? "");
      setLoaded(true);
    }
  }, [petQuery.data, loaded]);

  const utils = trpc.useUtils();
  const updateMutation = trpc.pet.update.useMutation({
    onSuccess: () => {
      utils.pet.getById.invalidate({ id: id! });
      utils.pet.listByHousehold.invalidate();
      utils.dashboard.get.invalidate();
      router.back();
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

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

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert("Missing info", "Please enter a name for your pet.");
      return;
    }
    updateMutation.mutate({
      id: id!,
      name: name.trim(),
      species,
      breed: breed.trim() || null,
      color: color.trim() || null,
      sex: sex ?? null,
      weight: weight ? parseFloat(weight) || null : null,
      medicalNotes: medicalNotes.trim() || null,
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <YStack padding="$4" gap="$4">
        {/* Name */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Name *</Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="e.g. Buddy"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* Species selector */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Species *</Text>
          <XStack flexWrap="wrap" gap="$2">
            {SPECIES_OPTIONS.map((s) => (
              <Pressable key={s} onPress={() => setSpecies(s)}>
                <Card
                  padding="$2"
                  paddingHorizontal="$3"
                  borderWidth={2}
                  borderColor={species === s ? "$petforcePrimary" : "$pfBorder"}
                >
                  <Text>{SPECIES_EMOJI[s]} {PET_SPECIES_LABELS[s]}</Text>
                </Card>
              </Pressable>
            ))}
          </XStack>
        </YStack>

        {/* Breed */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Breed</Text>
          <Input
            value={breed}
            onChangeText={setBreed}
            placeholder="e.g. Golden Retriever"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* Color */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Color</Text>
          <Input
            value={color}
            onChangeText={setColor}
            placeholder="e.g. Golden"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* Sex selector */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Sex</Text>
          <XStack gap="$2">
            {SEX_OPTIONS.map((s) => (
              <Pressable key={s} onPress={() => setSex(sex === s ? null : s)}>
                <Card
                  padding="$2"
                  paddingHorizontal="$3"
                  borderWidth={2}
                  borderColor={sex === s ? "$petforcePrimary" : "$pfBorder"}
                >
                  <Text>{PET_SEX_LABELS[s]}</Text>
                </Card>
              </Pressable>
            ))}
          </XStack>
        </YStack>

        {/* Weight */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Weight (lbs)</Text>
          <Input
            value={weight}
            onChangeText={setWeight}
            placeholder="e.g. 45"
            keyboardType="decimal-pad"
            borderColor="$pfBorder"
          />
        </YStack>

        {/* Medical notes */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">Medical Notes</Text>
          <TextArea
            value={medicalNotes}
            onChangeText={setMedicalNotes}
            placeholder="Allergies, conditions, etc."
            borderColor="$pfBorder"
            numberOfLines={3}
          />
        </YStack>

        {/* Submit */}
        <Pressable onPress={handleSubmit} disabled={updateMutation.isPending}>
          <Card
            backgroundColor="$petforcePrimary"
            padding="$3"
            alignItems="center"
          >
            {updateMutation.isPending ? (
              <Spinner size="small" color="white" />
            ) : (
              <Text color="white" fontWeight="bold" fontSize="$4">Save Changes</Text>
            )}
          </Card>
        </Pressable>
      </YStack>
    </ScrollView>
  );
}
