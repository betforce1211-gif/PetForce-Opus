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

// --- Feeding ---

export const FEEDING_LABEL_SUGGESTIONS = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
] as const;

export const FEEDING_TIME_PRESETS: Record<string, string> = {
  Breakfast: "08:00",
  Lunch: "12:00",
  Dinner: "18:00",
  Snack: "15:00",
};

// --- Calendar ---

export const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  walk: "🚶",
  feeding: "🍽️",
  vet_visit: "🏥",
  medication: "💊",
  grooming: "✂️",
  play: "🎾",
  other: "📝",
  feeding_schedule: "🍽️",
  birthday: "🎂",
  holiday: "🌟",
  vaccination: "💉",
  checkup: "🩺",
  procedure: "🔬",
};

/** Static list of national pet holidays/awareness days (month 1-12, day 1-31). */
export const PET_HOLIDAYS: { month: number; day: number; name: string }[] = [
  // January
  { month: 1, day: 2, name: "National Pet Travel Safety Day" },
  { month: 1, day: 5, name: "National Bird Day" },
  { month: 1, day: 14, name: "National Dress Up Your Pet Day" },
  { month: 1, day: 22, name: "Answer Your Cat's Question Day" },
  { month: 1, day: 24, name: "Change a Pet's Life Day" },
  // February
  { month: 2, day: 2, name: "National Hedgehog Day" },
  { month: 2, day: 3, name: "National Golden Retriever Day" },
  { month: 2, day: 14, name: "National Pet Theft Awareness Day" },
  { month: 2, day: 20, name: "Love Your Pet Day" },
  { month: 2, day: 22, name: "Walking the Dog Day" },
  { month: 2, day: 23, name: "National Dog Biscuit Day" },
  // March
  { month: 3, day: 3, name: "World Wildlife Day" },
  { month: 3, day: 13, name: "K9 Veterans Day" },
  { month: 3, day: 23, name: "National Puppy Day" },
  { month: 3, day: 28, name: "Respect Your Cat Day" },
  { month: 3, day: 30, name: "Take a Walk in the Park Day" },
  // April
  { month: 4, day: 8, name: "National Dog Fighting Awareness Day" },
  { month: 4, day: 10, name: "National Hug Your Dog Day" },
  { month: 4, day: 11, name: "National Pet Day" },
  { month: 4, day: 18, name: "Pet Owners Day" },
  { month: 4, day: 25, name: "World Veterinary Day" },
  { month: 4, day: 26, name: "National Pet Parents Day" },
  { month: 4, day: 30, name: "Adopt a Shelter Pet Day" },
  // May
  { month: 5, day: 1, name: "National Purebred Dog Day" },
  { month: 5, day: 3, name: "National Specially-Abled Pets Day" },
  { month: 5, day: 20, name: "National Rescue Dog Day" },
  { month: 5, day: 23, name: "World Turtle Day" },
  // June
  { month: 6, day: 4, name: "Hug Your Cat Day" },
  { month: 6, day: 8, name: "National Best Friends Day" },
  { month: 6, day: 9, name: "World Pet Memorial Day" },
  { month: 6, day: 26, name: "Take Your Dog to Work Day" },
  // July
  { month: 7, day: 1, name: "National ID Your Pet Day" },
  { month: 7, day: 10, name: "National Kitten Day" },
  { month: 7, day: 11, name: "All-American Pet Photo Day" },
  { month: 7, day: 15, name: "National Pet Fire Safety Day" },
  { month: 7, day: 31, name: "National Mutt Day" },
  // August
  { month: 8, day: 1, name: "DOGust: Shelter Dog Birthday" },
  { month: 8, day: 8, name: "International Cat Day" },
  { month: 8, day: 10, name: "Spoil Your Dog Day" },
  { month: 8, day: 15, name: "Check the Chip Day" },
  { month: 8, day: 17, name: "National Black Cat Appreciation Day" },
  { month: 8, day: 26, name: "National Dog Day" },
  { month: 8, day: 28, name: "Rainbow Bridge Remembrance Day" },
  // September
  { month: 9, day: 13, name: "National Pet Memorial Day" },
  { month: 9, day: 17, name: "National Pet Bird Day" },
  { month: 9, day: 28, name: "World Rabies Day" },
  // October
  { month: 10, day: 1, name: "National Black Dog Day" },
  { month: 10, day: 4, name: "World Animal Day" },
  { month: 10, day: 14, name: "Pet Obesity Awareness Day" },
  { month: 10, day: 29, name: "National Cat Day" },
  // November
  { month: 11, day: 1, name: "National Cook for Your Pets Day" },
  { month: 11, day: 17, name: "Take a Hike Day" },
  { month: 11, day: 21, name: "National Adoption Day" },
  // December
  { month: 12, day: 2, name: "National Mutt Day" },
  { month: 12, day: 4, name: "Wildlife Conservation Day" },
  { month: 12, day: 10, name: "International Animal Rights Day" },
];

// --- Health ---

export const HEALTH_RECORD_TYPE_LABELS: Record<string, string> = {
  vet_visit: "Vet Visit",
  vaccination: "Vaccination",
  checkup: "Checkup",
  procedure: "Procedure",
};

export const HEALTH_RECORD_TYPE_ICONS: Record<string, string> = {
  vet_visit: "\uD83C\uDFE5",
  vaccination: "\uD83D\uDC89",
  checkup: "\uD83E\uDE7A",
  procedure: "\uD83D\uDD2C",
};

export const MEDICATION_FREQUENCY_SUGGESTIONS = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Every other day",
  "Weekly",
  "As needed",
] as const;

export const COMMON_VACCINES: Record<string, string[]> = {
  dog: [
    "Rabies",
    "DHPP (Distemper)",
    "Bordetella",
    "Canine Influenza",
    "Leptospirosis",
    "Lyme Disease",
  ],
  cat: [
    "Rabies",
    "FVRCP (Distemper)",
    "FeLV (Feline Leukemia)",
    "FIV",
    "Bordetella",
  ],
};

// --- Finance / Expenses ---

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  food: "Food",
  treats: "Treats",
  toys: "Toys",
  grooming: "Grooming",
  boarding: "Boarding",
  insurance: "Insurance",
  supplies: "Supplies",
  training: "Training",
  other: "Other",
};

export const EXPENSE_CATEGORY_ICONS: Record<string, string> = {
  food: "\uD83C\uDF5A",
  treats: "\uD83E\uDD6C",
  toys: "\uD83E\uDDF8",
  grooming: "\u2702\uFE0F",
  boarding: "\uD83C\uDFE0",
  insurance: "\uD83D\uDEE1\uFE0F",
  supplies: "\uD83D\uDECD\uFE0F",
  training: "\uD83C\uDF93",
  other: "\uD83D\uDCB5",
  // Health record types (for merged finance view)
  vet_visit: "\uD83C\uDFE5",
  vaccination: "\uD83D\uDC89",
  checkup: "\uD83E\uDE7A",
  procedure: "\uD83D\uDD2C",
};

export const EXPENSE_DESCRIPTION_SUGGESTIONS: Record<string, string[]> = {
  food: ["Kibble", "Wet food", "Raw food", "Prescription diet"],
  treats: ["Training treats", "Dental chews", "Biscuits", "Jerky"],
  toys: ["Chew toy", "Ball", "Interactive puzzle", "Plush toy"],
  grooming: ["Bath", "Haircut", "Nail trim", "Teeth cleaning"],
  boarding: ["Daycare", "Overnight stay", "Pet sitting", "Dog walking"],
  insurance: ["Monthly premium", "Annual premium", "Deductible"],
  supplies: ["Collar", "Leash", "Bed", "Crate", "Litter", "Bowls"],
  training: ["Group class", "Private session", "Online course"],
  other: [],
};

export const PET_AVATAR_MAX_SIZE = 5 * 1024 * 1024; // 5MB
export const PET_AVATAR_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
