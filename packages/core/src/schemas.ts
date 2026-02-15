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
export const petSex = ["male", "female", "unknown"] as const;
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
  color: z.string().max(50).nullable().optional(),
  sex: z.enum(petSex).nullable().optional(),
  dateOfBirth: z.coerce.date().nullable().optional(),
  weight: z.number().positive().nullable().optional(),
  adoptionDate: z.coerce.date().nullable().optional(),
  microchipNumber: z.string().max(50).nullable().optional(),
  rabiesTagNumber: z.string().max(50).nullable().optional(),
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

// --- Invitations ---

export const invitableRoles = ["admin", "member", "sitter"] as const;

export const createInvitationSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(invitableRoles),
});

// --- Access Requests ---

export const createAccessRequestSchema = z.object({
  joinCode: z.string().min(1),
  displayName: z.string().min(1).max(50),
  message: z.string().max(500).optional(),
});

// --- Feeding ---

export const createFeedingScheduleSchema = z.object({
  petId: z.string().uuid(),
  label: z.string().min(1).max(50),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
  foodType: z.string().max(100).nullable().optional(),
  amount: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const updateFeedingScheduleSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(50).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format").optional(),
  foodType: z.string().max(100).nullable().optional(),
  amount: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const logFeedingSchema = z.object({
  feedingScheduleId: z.string().uuid(),
  feedingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
  notes: z.string().max(500).nullable().optional(),
});

// --- Calendar ---

export const calendarMonthInputSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM format"),
});

export const calendarUpcomingInputSchema = z.object({
  limit: z.number().int().min(1).max(20).optional(),
});

// --- Health Records ---

export const healthRecordTypes = [
  "vet_visit",
  "vaccination",
  "checkup",
  "procedure",
] as const;

export const createHealthRecordSchema = z.object({
  petId: z.string().uuid(),
  type: z.enum(healthRecordTypes),
  date: z.coerce.date(),
  vetOrClinic: z.string().max(200).nullable().optional(),
  reason: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  cost: z.number().nonnegative().nullable().optional(),
  vaccineName: z.string().max(200).nullable().optional(),
  nextDueDate: z.coerce.date().nullable().optional(),
});

export const updateHealthRecordSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(healthRecordTypes).optional(),
  date: z.coerce.date().optional(),
  vetOrClinic: z.string().max(200).nullable().optional(),
  reason: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  cost: z.number().nonnegative().nullable().optional(),
  vaccineName: z.string().max(200).nullable().optional(),
  nextDueDate: z.coerce.date().nullable().optional(),
});

// --- Medications ---

export const createMedicationSchema = z.object({
  petId: z.string().uuid(),
  name: z.string().min(1).max(200),
  dosage: z.string().max(100).nullable().optional(),
  frequency: z.string().max(100).nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  prescribedBy: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateMedicationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  dosage: z.string().max(100).nullable().optional(),
  frequency: z.string().max(100).nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  prescribedBy: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
});

// --- Finance / Expenses ---

export const expenseCategories = [
  "food",
  "treats",
  "toys",
  "grooming",
  "boarding",
  "insurance",
  "supplies",
  "training",
  "other",
] as const;

export const createExpenseSchema = z.object({
  petId: z.string().uuid(),
  category: z.enum(expenseCategories),
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  date: z.coerce.date(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateExpenseSchema = z.object({
  id: z.string().uuid(),
  category: z.enum(expenseCategories).optional(),
  description: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  date: z.coerce.date().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const financeSummaryInputSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM format")
    .optional(),
});

// --- Onboarding ---

export const onboardHouseholdSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(50),
  theme: householdThemeSchema.optional(),
});
