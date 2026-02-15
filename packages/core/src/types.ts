export type MemberRole = "owner" | "admin" | "member" | "sitter";
export type InvitableRole = "admin" | "member" | "sitter";
export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";
export type AccessRequestStatus = "pending" | "approved" | "denied";

export type PetSpecies = "dog" | "cat" | "bird" | "fish" | "reptile" | "other";
export type PetSex = "male" | "female" | "unknown";

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
  joinCode: string | null;
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
  color: string | null;
  sex: PetSex | null;
  dateOfBirth: Date | null;
  weight: number | null;
  adoptionDate: Date | null;
  microchipNumber: string | null;
  rabiesTagNumber: string | null;
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

// --- Invitations ---

export interface Invitation {
  id: string;
  householdId: string;
  invitedBy: string;
  email: string | null;
  token: string;
  role: InvitableRole;
  status: InvitationStatus;
  createdAt: Date;
  expiresAt: Date;
}

// --- Access Requests ---

export interface AccessRequest {
  id: string;
  householdId: string;
  userId: string;
  displayName: string;
  message: string | null;
  status: AccessRequestStatus;
  reviewedBy: string | null;
  createdAt: Date;
}

// --- Feeding ---

export interface FeedingSchedule {
  id: string;
  householdId: string;
  petId: string;
  label: string;
  time: string; // "HH:mm"
  foodType: string | null;
  amount: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedingLog {
  id: string;
  feedingScheduleId: string;
  householdId: string;
  petId: string;
  completedBy: string;
  completedAt: Date;
  feedingDate: string; // "YYYY-MM-DD"
  notes: string | null;
}

export interface FeedingScheduleStatus {
  schedule: FeedingSchedule;
  log: FeedingLog | null;
}

export interface PetFeedingStatus {
  petId: string;
  petName: string;
  schedules: FeedingScheduleStatus[];
}

export interface HouseholdFeedingStatus {
  date: string; // "YYYY-MM-DD"
  pets: PetFeedingStatus[];
  totalScheduled: number;
  totalCompleted: number;
}

// --- Calendar ---

export type CalendarEventKind = "activity" | "feeding" | "birthday" | "holiday" | "health";

export interface CalendarEvent {
  id: string;
  kind: CalendarEventKind;
  title: string;
  petId: string;
  petName: string;
  memberId: string | null;
  memberName: string | null;
  type: ActivityType | "feeding_schedule" | "birthday" | "holiday" | HealthRecordType;
  scheduledAt: string; // ISO datetime
  completedAt: string | null;
}

export interface CalendarMonthData {
  month: string; // YYYY-MM
  days: Record<string, CalendarEvent[]>; // keyed by YYYY-MM-DD
}

export interface UpcomingCalendarEvents {
  events: CalendarEvent[];
  totalUpcoming: number;
}

// --- Health ---

export type HealthRecordType = "vet_visit" | "vaccination" | "checkup" | "procedure";

export interface HealthRecord {
  id: string;
  householdId: string;
  petId: string;
  type: HealthRecordType;
  date: Date;
  vetOrClinic: string | null;
  reason: string | null;
  notes: string | null;
  cost: number | null;
  vaccineName: string | null;
  nextDueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Medication {
  id: string;
  householdId: string;
  petId: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  startDate: Date | null;
  endDate: Date | null;
  prescribedBy: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthSummary {
  activeMedicationCount: number;
  overdueVaccinationCount: number;
  nextAppointment: { petName: string; date: string; reason: string | null } | null;
}

// --- Finance / Expenses ---

export type ExpenseCategory =
  | "food"
  | "treats"
  | "toys"
  | "grooming"
  | "boarding"
  | "insurance"
  | "supplies"
  | "training"
  | "other";

export interface Expense {
  id: string;
  householdId: string;
  petId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinanceSummaryItem {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO
  category: string;
  petId: string;
  petName: string;
  source: "expense" | "health";
}

export interface FinanceSummary {
  monthlyTotal: number;
  previousMonthTotal: number;
  byCategory: { category: string; total: number }[];
  byPet: { petId: string; petName: string; total: number }[];
  recentExpenses: FinanceSummaryItem[];
}

// --- Dashboard view types ---

export interface HouseholdSummary {
  id: string;
  name: string;
  theme: HouseholdTheme;
  petCount: number;
  memberCount: number;
}

export interface HouseholdDashboard {
  household: Household;
  members: Member[];
  pets: Pet[];
  recentActivities: Activity[];
}

// --- Today's Tasks ---

export type TaskKind = "alert" | "feeding" | "activity" | "health" | "medication" | "birthday";
export type TaskPriority = "high" | "medium" | "low";
