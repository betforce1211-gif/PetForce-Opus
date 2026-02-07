export type MemberRole = "owner" | "admin" | "member" | "sitter";

export type PetSpecies = "dog" | "cat" | "bird" | "fish" | "reptile" | "other";

export type ActivityType =
  | "walk"
  | "feeding"
  | "vet_visit"
  | "medication"
  | "grooming"
  | "play"
  | "other";

export interface HouseholdTheme {
  primaryColor: string;
  secondaryColor: string;
  avatar: string | null;
}

export interface Household {
  id: string;
  name: string;
  theme: HouseholdTheme;
  createdAt: Date;
  updatedAt: Date;
}

export interface Member {
  id: string;
  householdId: string;
  userId: string;
  role: MemberRole;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: Date;
}

export interface Pet {
  id: string;
  householdId: string;
  name: string;
  species: PetSpecies;
  breed: string | null;
  dateOfBirth: Date | null;
  weight: number | null;
  medicalNotes: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  householdId: string;
  petId: string;
  memberId: string;
  type: ActivityType;
  title: string;
  notes: string | null;
  scheduledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}
