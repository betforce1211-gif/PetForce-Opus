import { z } from "zod";

export const memberRoles = ["owner", "admin", "member", "sitter"] as const;
export const petSpecies = [
  "dog",
  "cat",
  "bird",
  "fish",
  "reptile",
  "other",
] as const;
export const activityTypes = [
  "walk",
  "feeding",
  "vet_visit",
  "medication",
  "grooming",
  "play",
  "other",
] as const;

// --- Household ---

export const householdThemeSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #FF5733"),
  secondaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #FF5733"),
  avatar: z.string().url().nullable(),
});

export const createHouseholdSchema = z.object({
  name: z.string().min(1).max(100),
  theme: householdThemeSchema.optional(),
});

export const updateHouseholdSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  theme: householdThemeSchema.partial().optional(),
});

// --- Member ---

export const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(memberRoles),
  displayName: z.string().min(1).max(50),
});

export const updateMemberSchema = z.object({
  role: z.enum(memberRoles).optional(),
  displayName: z.string().min(1).max(50).optional(),
});

// --- Pet ---

export const createPetSchema = z.object({
  name: z.string().min(1).max(100),
  species: z.enum(petSpecies),
  breed: z.string().max(100).nullable().optional(),
  dateOfBirth: z.coerce.date().nullable().optional(),
  weight: z.number().positive().nullable().optional(),
  medicalNotes: z.string().max(5000).nullable().optional(),
});

export const updatePetSchema = createPetSchema.partial();

// --- Activity ---

export const createActivitySchema = z.object({
  petId: z.string().min(1),
  type: z.enum(activityTypes),
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).nullable().optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
});

export const updateActivitySchema = createActivitySchema.partial();

// --- Onboarding ---

export const onboardHouseholdSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(50),
  theme: householdThemeSchema.optional(),
});
