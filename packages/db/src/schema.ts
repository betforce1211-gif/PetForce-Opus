import {
  pgTable,
  text,
  timestamp,
  jsonb,
  real,
  uuid,
  boolean,
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
});

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
});

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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
});

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
});

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
});

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
});
