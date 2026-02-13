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

export const PET_SEX_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  unknown: "Unknown",
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

export const INVITATION_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
};

export const ACCESS_REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  denied: "Denied",
};

export const INVITE_EXPIRY_DAYS = 7;

export const PET_AVATAR_MAX_SIZE = 5 * 1024 * 1024; // 5MB
export const PET_AVATAR_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
