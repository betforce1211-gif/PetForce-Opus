import {
  pgTable,
  text,
  timestamp,
  jsonb,
  real,
  uuid,
  boolean,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// --- Households ---

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  theme: jsonb("theme")
    .notNull()
    .$type<{ primaryColor: string; secondaryColor: string; avatar: string | null }>()
    .default({ primaryColor: "#6366F1", secondaryColor: "#EC4899", avatar: null }),
  joinCode: text("join_code").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Members ---

export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role", { enum: ["owner", "admin", "member", "sitter"] }).notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdUserUnique: uniqueIndex("members_household_user_idx").on(table.householdId, table.userId),
  userIdx: index("members_user_idx").on(table.userId),
}));

// --- Pets ---

export const pets = pgTable("pets", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  species: text("species", {
    enum: ["dog", "cat", "bird", "fish", "reptile", "other"],
  }).notNull(),
  breed: text("breed"),
  color: text("color"),
  sex: text("sex", { enum: ["male", "female", "unknown"] }),
  dateOfBirth: timestamp("date_of_birth", { withTimezone: true }),
  weight: real("weight"),
  adoptionDate: timestamp("adoption_date", { withTimezone: true }),
  microchipNumber: text("microchip_number"),
  rabiesTagNumber: text("rabies_tag_number"),
  medicalNotes: text("medical_notes"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdIdx: index("pets_household_idx").on(table.householdId),
}));

// --- Pet Photos ---

export const petPhotos = pgTable("pet_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  petId: uuid("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  caption: text("caption"),
  takenAt: timestamp("taken_at", { withTimezone: true }),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  petIdx: index("pet_photos_pet_idx").on(table.petId),
  householdIdx: index("pet_photos_household_idx").on(table.householdId),
  uploadedByIdx: index("pet_photos_uploaded_by_idx").on(table.uploadedBy),
}));

// --- Activities ---

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  petId: uuid("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["walk", "feeding", "vet_visit", "medication", "grooming", "play", "other"],
  }).notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  completedBy: uuid("completed_by").references(() => members.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdIdx: index("activities_household_idx").on(table.householdId),
  petIdx: index("activities_pet_idx").on(table.petId),
  householdScheduledIdx: index("activities_household_scheduled_idx").on(table.householdId, table.scheduledAt),
  householdCompletedIdx: index("activities_household_completed_idx").on(table.householdId, table.completedAt),
}));

// --- Invitations ---

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  invitedBy: uuid("invited_by")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  email: text("email"),
  token: text("token").unique().notNull(),
  role: text("role", { enum: ["admin", "member", "sitter"] }).notNull(),
  status: text("status", {
    enum: ["pending", "accepted", "declined", "expired"],
  })
    .notNull()
    .default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => ({
  householdIdx: index("invitations_household_idx").on(table.householdId),
  householdStatusIdx: index("invitations_household_status_idx").on(table.householdId, table.status),
}));

// --- Feeding Schedules ---

export const feedingSchedules = pgTable("feeding_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  petId: uuid("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  time: text("time").notNull(), // "HH:mm" format
  foodType: text("food_type"),
  amount: text("amount"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdIdx: index("feeding_schedules_household_idx").on(table.householdId),
  householdActiveIdx: index("feeding_schedules_household_active_idx").on(table.householdId, table.isActive),
}));

// --- Feeding Logs ---

export const feedingLogs = pgTable("feeding_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  feedingScheduleId: uuid("feeding_schedule_id")
    .notNull()
    .references(() => feedingSchedules.id, { onDelete: "cascade" }),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  petId: uuid("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  completedBy: uuid("completed_by")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  feedingDate: text("feeding_date").notNull(), // "YYYY-MM-DD" format
  notes: text("notes"),
  skipped: boolean("skipped").notNull().default(false),
}, (table) => ({
  householdIdx: index("feeding_logs_household_idx").on(table.householdId),
  scheduleDateMemberUnique: uniqueIndex("feeding_logs_schedule_date_member_idx").on(
    table.feedingScheduleId,
    table.feedingDate,
    table.completedBy
  ),
}));

// --- Feeding Snoozes ---

export const feedingSnoozes = pgTable("feeding_snoozes", {
  id: uuid("id").primaryKey().defaultRandom(),
  feedingScheduleId: uuid("feeding_schedule_id")
    .notNull()
    .references(() => feedingSchedules.id, { onDelete: "cascade" }),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  snoozeDate: text("snooze_date").notNull(), // "YYYY-MM-DD"
  snoozedUntil: timestamp("snoozed_until", { withTimezone: true }).notNull(),
  snoozedBy: uuid("snoozed_by")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  scheduleDateMemberUnique: uniqueIndex("feeding_snoozes_schedule_date_member_idx").on(
    table.feedingScheduleId,
    table.snoozeDate,
    table.snoozedBy
  ),
}));

// --- Health Records ---

export const healthRecords = pgTable("health_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  petId: uuid("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["vet_visit", "vaccination", "checkup", "procedure"],
  }).notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  vetOrClinic: text("vet_or_clinic"),
  reason: text("reason"),
  notes: text("notes"),
  cost: real("cost"),
  vaccineName: text("vaccine_name"),
  nextDueDate: timestamp("next_due_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdIdx: index("health_records_household_idx").on(table.householdId),
  householdDateIdx: index("health_records_household_date_idx").on(table.householdId, table.date),
}));

// --- Medications ---

export const medications = pgTable("medications", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  petId: uuid("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dosage: text("dosage"),
  frequency: text("frequency"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  prescribedBy: text("prescribed_by"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdIdx: index("medications_household_idx").on(table.householdId),
  householdActiveIdx: index("medications_household_active_idx").on(table.householdId, table.isActive),
}));

// --- Medication Logs ---

export const medicationLogs = pgTable("medication_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  medicationId: uuid("medication_id")
    .notNull()
    .references(() => medications.id, { onDelete: "cascade" }),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  loggedDate: text("logged_date").notNull(), // "YYYY-MM-DD"
  loggedBy: uuid("logged_by")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  skipped: boolean("skipped").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  medicationDateMemberUnique: uniqueIndex("medication_logs_medication_date_member_idx").on(
    table.medicationId,
    table.loggedDate,
    table.loggedBy
  ),
}));

// --- Medication Snoozes ---

export const medicationSnoozes = pgTable("medication_snoozes", {
  id: uuid("id").primaryKey().defaultRandom(),
  medicationId: uuid("medication_id")
    .notNull()
    .references(() => medications.id, { onDelete: "cascade" }),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  snoozeDate: text("snooze_date").notNull(), // "YYYY-MM-DD"
  snoozedUntil: timestamp("snoozed_until", { withTimezone: true }).notNull(),
  snoozedBy: uuid("snoozed_by")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  medicationDateMemberUnique: uniqueIndex("medication_snoozes_medication_date_member_idx").on(
    table.medicationId,
    table.snoozeDate,
    table.snoozedBy
  ),
}));

// --- Expenses ---

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  petId: uuid("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  category: text("category", {
    enum: [
      "food",
      "treats",
      "toys",
      "grooming",
      "boarding",
      "insurance",
      "supplies",
      "training",
      "other",
    ],
  }).notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdIdx: index("expenses_household_idx").on(table.householdId),
  householdDateIdx: index("expenses_household_date_idx").on(table.householdId, table.date),
}));

// --- Pet Notes ---

export const petNotes = pgTable("pet_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  petId: uuid("pet_id").references(() => pets.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdIdx: index("pet_notes_household_idx").on(table.householdId),
  petIdx: index("pet_notes_pet_idx").on(table.petId),
}));

// --- Access Requests ---

export const accessRequests = pgTable("access_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  displayName: text("display_name").notNull(),
  message: text("message"),
  status: text("status", {
    enum: ["pending", "approved", "denied"],
  })
    .notNull()
    .default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => members.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdStatusIdx: index("access_requests_household_status_idx").on(table.householdId, table.status),
}));

// --- Member Game Stats (Gamification) ---

export const memberGameStats = pgTable("member_game_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  totalXp: integer("total_xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: text("last_active_date"),
  unlockedBadgeIds: jsonb("unlocked_badge_ids")
    .$type<string[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdIdx: index("member_game_stats_household_idx").on(table.householdId),
}));

// --- Household Game Stats (Gamification) ---

export const householdGameStats = pgTable("household_game_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  totalXp: integer("total_xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: text("last_active_date"),
  unlockedBadgeIds: jsonb("unlocked_badge_ids")
    .$type<string[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Pet Game Stats (Gamification) ---

export const petGameStats = pgTable("pet_game_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  petId: uuid("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  totalXp: integer("total_xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: text("last_active_date"),
  unlockedBadgeIds: jsonb("unlocked_badge_ids")
    .$type<string[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdIdx: index("pet_game_stats_household_idx").on(table.householdId),
}));

// --- Activity Log (Audit Trail) ---

export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // e.g. "member.role_changed", "pet.updated", "medication.created"
  subjectType: text("subject_type").notNull(), // e.g. "member", "pet", "medication", "household"
  subjectId: uuid("subject_id"),
  subjectName: text("subject_name"), // snapshot: pet name, member name, etc.
  performedBy: uuid("performed_by")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  householdCreatedIdx: index("activity_log_household_created_idx").on(
    table.householdId,
    table.createdAt
  ),
  performedByCreatedIdx: index("activity_log_performed_by_created_idx").on(
    table.performedBy,
    table.createdAt
  ),
}));

// --- Analytics Events ---

export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  householdId: uuid("household_id").references(() => households.id, {
    onDelete: "set null",
  }),
  eventName: text("event_name").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userCreatedIdx: index("analytics_events_user_created_idx").on(table.userId, table.createdAt),
  householdCreatedIdx: index("analytics_events_household_created_idx").on(table.householdId, table.createdAt),
}));
