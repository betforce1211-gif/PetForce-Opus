export type MemberRole = "owner" | "admin" | "member" | "sitter";
export type InvitableRole = "admin" | "member" | "sitter";
export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";
export type AccessRequestStatus = "pending" | "approved" | "denied";

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
