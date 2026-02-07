export const DEFAULT_THEME = {
  primaryColor: "#6366F1",
  secondaryColor: "#EC4899",
  avatar: null,
} as const;

export const MEMBER_ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  sitter: "Sitter",
};

export const PET_SPECIES_LABELS: Record<string, string> = {
  dog: "Dog",
  cat: "Cat",
  bird: "Bird",
  fish: "Fish",
  reptile: "Reptile",
  other: "Other",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  walk: "Walk",
  feeding: "Feeding",
  vet_visit: "Vet Visit",
  medication: "Medication",
  grooming: "Grooming",
  play: "Play",
  other: "Other",
};
