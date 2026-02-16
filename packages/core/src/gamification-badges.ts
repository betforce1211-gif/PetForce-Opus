// Data-driven badge system — no switch statements needed for evaluation.
// Each badge has a `rules` array. A badge is earned when ALL rules pass.

export type GamificationGroup = "member" | "household" | "pet";

export interface BadgeRule {
  field: "totalTasks" | "feedingCount" | "medicationCount" | "activityCount" | "longestStreak" | "level" | "activeMemberCount";
  op: ">=" | "=";
  value: number;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  group: GamificationGroup;
  category: string;
  rules: BadgeRule[];
  /** @deprecated kept for backward compat — use rules instead */
  condition: string;
}

// Helper to build a single-rule badge concisely
function b(
  id: string, name: string, icon: string, description: string,
  group: GamificationGroup, category: string,
  field: BadgeRule["field"], value: number,
): BadgeDefinition {
  return {
    id, name, icon, description, group, category,
    rules: [{ field, op: ">=", value }],
    condition: `${field} >= ${value}`,
  };
}

// ═══════════════════════════════════════════════
// MEMBER BADGES (~60)
// ═══════════════════════════════════════════════

const memberMilestones: BadgeDefinition[] = [
  b("first_steps",       "First Steps",       "\uD83D\uDC3E", "Complete your first task",       "member", "Milestones", "totalTasks", 1),
  b("high_five",         "High Five",         "\u270B",        "Complete 5 tasks",               "member", "Milestones", "totalTasks", 5),
  b("double_digits",     "Double Digits",     "\uD83D\uDD1F",  "Complete 10 tasks",              "member", "Milestones", "totalTasks", 10),
  b("quarter_century",   "Quarter Century",   "\uD83C\uDF1F",  "Complete 25 tasks",              "member", "Milestones", "totalTasks", 25),
  b("half_century",      "Half Century",      "\u2B50",        "Complete 50 tasks",              "member", "Milestones", "totalTasks", 50),
  b("century_club",      "Century Club",      "\uD83D\uDCAF",  "Complete 100 tasks",             "member", "Milestones", "totalTasks", 100),
  b("power_250",         "Power 250",         "\u26A1",        "Complete 250 tasks",             "member", "Milestones", "totalTasks", 250),
  b("fab_500",           "Fab 500",           "\uD83D\uDC8E",  "Complete 500 tasks",             "member", "Milestones", "totalTasks", 500),
  b("grand_thousand",    "Grand Thousand",    "\uD83C\uDFC6",  "Complete 1,000 tasks",           "member", "Milestones", "totalTasks", 1000),
  b("mega_2500",         "Mega 2500",         "\uD83D\uDE80",  "Complete 2,500 tasks",           "member", "Milestones", "totalTasks", 2500),
  b("ultimate_5000",     "Ultimate 5000",     "\uD83D\uDC51",  "Complete 5,000 tasks",           "member", "Milestones", "totalTasks", 5000),
];

const memberFeeding: BadgeDefinition[] = [
  b("first_feeding",     "First Feeding",     "\uD83C\uDF7D\uFE0F", "Complete your first feeding",   "member", "Feeding", "feedingCount", 1),
  b("feeding_frenzy",    "Feeding Frenzy",    "\uD83C\uDF7D\uFE0F", "Complete 10 feedings",          "member", "Feeding", "feedingCount", 10),
  b("feeding_pro",       "Feeding Pro",       "\uD83C\uDF73",       "Complete 25 feedings",          "member", "Feeding", "feedingCount", 25),
  b("feeding_fiend",     "Feeding Fiend",     "\uD83C\uDF56",       "Complete 50 feedings",          "member", "Feeding", "feedingCount", 50),
  b("feeding_centurion", "Feeding Centurion", "\uD83C\uDF72",       "Complete 100 feedings",         "member", "Feeding", "feedingCount", 100),
  b("feeding_master",    "Feeding Master",    "\uD83E\uDD58",       "Complete 250 feedings",         "member", "Feeding", "feedingCount", 250),
  b("feeding_legend",    "Feeding Legend",    "\uD83C\uDF1F",       "Complete 500 feedings",         "member", "Feeding", "feedingCount", 500),
  b("feeding_titan",     "Feeding Titan",     "\uD83C\uDF0D",       "Complete 1,000 feedings",       "member", "Feeding", "feedingCount", 1000),
];

const memberMedication: BadgeDefinition[] = [
  b("first_med",         "First Med",         "\uD83D\uDC8A", "Give your first medication",       "member", "Medication", "medicationCount", 1),
  b("med_master",        "Med Master",        "\uD83D\uDC8A", "Complete 10 medications",          "member", "Medication", "medicationCount", 10),
  b("med_pro",           "Med Pro",           "\uD83E\uDDEA", "Complete 25 medications",          "member", "Medication", "medicationCount", 25),
  b("med_expert",        "Med Expert",        "\u2695\uFE0F", "Complete 50 medications",          "member", "Medication", "medicationCount", 50),
  b("med_centurion",     "Med Centurion",     "\uD83C\uDFE5", "Complete 100 medications",         "member", "Medication", "medicationCount", 100),
  b("med_legend",        "Med Legend",        "\uD83E\uDDEC", "Complete 250 medications",         "member", "Medication", "medicationCount", 250),
  b("med_titan",         "Med Titan",         "\uD83E\uDE7A", "Complete 500 medications",         "member", "Medication", "medicationCount", 500),
];

const memberActivity: BadgeDefinition[] = [
  b("first_activity",    "First Activity",    "\uD83D\uDCCB", "Complete your first activity",     "member", "Activities", "activityCount", 1),
  b("walk_star",         "Walk Star",         "\u2B50",       "Complete 10 activities",           "member", "Activities", "activityCount", 10),
  b("activity_pro",      "Activity Pro",      "\uD83C\uDFC3", "Complete 25 activities",           "member", "Activities", "activityCount", 25),
  b("activity_hero",     "Activity Hero",     "\uD83E\uDDB8", "Complete 50 activities",           "member", "Activities", "activityCount", 50),
  b("activity_centurion","Activity Centurion","\uD83C\uDFC5", "Complete 100 activities",          "member", "Activities", "activityCount", 100),
  b("activity_master",   "Activity Master",   "\uD83E\uDD47", "Complete 250 activities",          "member", "Activities", "activityCount", 250),
  b("activity_legend",   "Activity Legend",   "\uD83C\uDF0A", "Complete 500 activities",          "member", "Activities", "activityCount", 500),
];

const memberStreaks: BadgeDefinition[] = [
  b("three_day_streak",  "Three Day Streak",  "\uD83D\uDD25", "3-day activity streak",           "member", "Streaks", "longestStreak", 3),
  b("week_warrior",      "Week Warrior",      "\uD83D\uDD25", "7-day activity streak",           "member", "Streaks", "longestStreak", 7),
  b("fortnight_hero",    "Fortnight Hero",    "\uD83D\uDCAA", "14-day activity streak",          "member", "Streaks", "longestStreak", 14),
  b("month_master",      "Month Master",      "\uD83C\uDFC6", "30-day activity streak",          "member", "Streaks", "longestStreak", 30),
  b("two_month_titan",   "Two Month Titan",   "\u26A1",       "60-day activity streak",          "member", "Streaks", "longestStreak", 60),
  b("quarter_streak",    "Quarter Streak",    "\uD83D\uDC8E", "90-day activity streak",          "member", "Streaks", "longestStreak", 90),
  b("half_year_hero",    "Half Year Hero",    "\uD83C\uDF1F",  "180-day activity streak",         "member", "Streaks", "longestStreak", 180),
  b("year_legend",       "Year Legend",       "\uD83D\uDC51", "365-day activity streak",         "member", "Streaks", "longestStreak", 365),
];

const memberLevels: BadgeDefinition[] = [
  b("pet_parent_pro",    "Pet Parent Pro",    "\uD83C\uDF1F", "Reach level 5",                   "member", "Levels", "level", 5),
  b("level_10_member",   "Dedicated Carer",   "\u2B50",       "Reach level 10",                  "member", "Levels", "level", 10),
  b("level_25_member",   "Silver Caretaker",  "\uD83E\uDD48", "Reach level 25",                  "member", "Levels", "level", 25),
  b("level_50_member",   "Gold Guardian",     "\uD83E\uDD47", "Reach level 50",                  "member", "Levels", "level", 50),
  b("level_75_member",   "Platinum Patron",   "\uD83D\uDC8E", "Reach level 75",                  "member", "Levels", "level", 75),
  b("level_100_member",  "Diamond Legend",    "\uD83D\uDC51", "Reach level 100",                 "member", "Levels", "level", 100),
];

// ═══════════════════════════════════════════════
// HOUSEHOLD BADGES (~40)
// ═══════════════════════════════════════════════

const householdMilestones: BadgeDefinition[] = [
  b("house_warming",        "House Warming",        "\uD83C\uDFE0", "Household's first task",          "household", "Milestones", "totalTasks", 1),
  b("house_five",           "House Five",           "\u270B",       "5 household tasks",               "household", "Milestones", "totalTasks", 5),
  b("house_ten",            "House Ten",            "\uD83D\uDD1F", "10 household tasks",              "household", "Milestones", "totalTasks", 10),
  b("house_25",             "Quarter Mark",         "\uD83C\uDF1F", "25 household tasks",              "household", "Milestones", "totalTasks", 25),
  b("house_50",             "Half Century Home",    "\u2B50",       "50 household tasks",              "household", "Milestones", "totalTasks", 50),
  b("century_home",         "Century Home",         "\uD83C\uDFDB\uFE0F", "100 household tasks",       "household", "Milestones", "totalTasks", 100),
  b("house_250",            "Power House",          "\u26A1",       "250 household tasks",             "household", "Milestones", "totalTasks", 250),
  b("house_500",            "Fab House",            "\uD83D\uDC8E", "500 household tasks",             "household", "Milestones", "totalTasks", 500),
  b("house_1000",           "Grand House",          "\uD83C\uDFC6", "1,000 household tasks",           "household", "Milestones", "totalTasks", 1000),
  b("house_2500",           "Mega House",           "\uD83D\uDE80", "2,500 household tasks",           "household", "Milestones", "totalTasks", 2500),
  b("house_5000",           "Ultimate House",       "\uD83D\uDC51", "5,000 household tasks",           "household", "Milestones", "totalTasks", 5000),
];

const householdStreaks: BadgeDefinition[] = [
  b("house_3_streak",       "House Warmup",         "\uD83D\uDD25", "3-day household streak",          "household", "Streaks", "longestStreak", 3),
  b("team_effort",          "Team Effort",          "\uD83E\uDD1D", "7-day household streak",          "household", "Streaks", "longestStreak", 7),
  b("house_14_streak",      "Family Rhythm",        "\uD83C\uDFB5", "14-day household streak",         "household", "Streaks", "longestStreak", 14),
  b("family_commitment",    "Family Commitment",    "\uD83D\uDC96", "30-day household streak",         "household", "Streaks", "longestStreak", 30),
  b("house_60_streak",      "Family Marathon",      "\u26A1",       "60-day household streak",         "household", "Streaks", "longestStreak", 60),
  b("house_90_streak",      "Family Fortress",      "\uD83D\uDC8E", "90-day household streak",         "household", "Streaks", "longestStreak", 90),
  b("house_180_streak",     "Family Legacy",        "\uD83C\uDF1F", "180-day household streak",        "household", "Streaks", "longestStreak", 180),
  b("house_365_streak",     "Family Dynasty",       "\uD83D\uDC51", "365-day household streak",        "household", "Streaks", "longestStreak", 365),
];

const householdMembers: BadgeDefinition[] = [
  b("duo_house",            "Dynamic Duo",          "\uD83D\uDC6B", "2 active members",                "household", "Members", "activeMemberCount", 2),
  b("full_house",           "Full House",           "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66", "3+ active members", "household", "Members", "activeMemberCount", 3),
  b("fab_five",             "Fab Five",             "\uD83C\uDF1F", "5 active members",                "household", "Members", "activeMemberCount", 5),
  b("great_eight",          "Great Eight",          "\u2B50",       "8 active members",                "household", "Members", "activeMemberCount", 8),
  b("perfect_ten",          "Perfect Ten",          "\uD83D\uDCAF", "10 active members",               "household", "Members", "activeMemberCount", 10),
];

const householdLevels: BadgeDefinition[] = [
  b("dream_team",           "Dream Team",           "\uD83C\uDF1F", "Household reaches level 5",       "household", "Levels", "level", 5),
  b("level_10_house",       "Established Home",     "\u2B50",       "Household reaches level 10",      "household", "Levels", "level", 10),
  b("level_25_house",       "Silver Home",          "\uD83E\uDD48", "Household reaches level 25",      "household", "Levels", "level", 25),
  b("level_50_house",       "Gold Home",            "\uD83E\uDD47", "Household reaches level 50",      "household", "Levels", "level", 50),
  b("level_75_house",       "Platinum Home",        "\uD83D\uDC8E", "Household reaches level 75",      "household", "Levels", "level", 75),
  b("level_100_house",      "Diamond Home",         "\uD83D\uDC51", "Household reaches level 100",     "household", "Levels", "level", 100),
];

// ═══════════════════════════════════════════════
// PET BADGES (~50)
// ═══════════════════════════════════════════════

const petMilestones: BadgeDefinition[] = [
  b("first_care",           "First Care",           "\uD83D\uDC3E", "First task for this pet",         "pet", "Milestones", "totalTasks", 1),
  b("pet_five",             "Paw Five",             "\u270B",       "5 tasks for this pet",            "pet", "Milestones", "totalTasks", 5),
  b("pet_ten",              "Pet Ten",              "\uD83D\uDD1F", "10 tasks for this pet",           "pet", "Milestones", "totalTasks", 10),
  b("pet_25",               "Pet Quarter",          "\uD83C\uDF1F", "25 tasks for this pet",           "pet", "Milestones", "totalTasks", 25),
  b("pet_50",               "Pet Half Century",     "\u2B50",       "50 tasks for this pet",           "pet", "Milestones", "totalTasks", 50),
  b("vip_pet",              "VIP Pet",              "\uD83C\uDFC6", "100 tasks for this pet",          "pet", "Milestones", "totalTasks", 100),
  b("pet_250",              "Star Pet",             "\u26A1",       "250 tasks for this pet",          "pet", "Milestones", "totalTasks", 250),
  b("pet_500",              "Super Pet",            "\uD83D\uDC8E", "500 tasks for this pet",          "pet", "Milestones", "totalTasks", 500),
  b("pet_1000",             "Mega Pet",             "\uD83D\uDE80", "1,000 tasks for this pet",        "pet", "Milestones", "totalTasks", 1000),
  b("pet_2500",             "Ultra Pet",            "\uD83D\uDC51", "2,500 tasks for this pet",        "pet", "Milestones", "totalTasks", 2500),
];

const petFeeding: BadgeDefinition[] = [
  b("pet_first_feed",       "First Bite",           "\uD83C\uDF7D\uFE0F", "First feeding logged",         "pet", "Feeding", "feedingCount", 1),
  b("well_fed",             "Well Fed",             "\uD83C\uDF7D\uFE0F", "10 feedings logged",           "pet", "Feeding", "feedingCount", 10),
  b("pet_feed_25",          "Foodie",               "\uD83C\uDF73",       "25 feedings logged",           "pet", "Feeding", "feedingCount", 25),
  b("pet_feed_50",          "Gourmet Pet",          "\uD83C\uDF56",       "50 feedings logged",           "pet", "Feeding", "feedingCount", 50),
  b("pet_feed_100",         "Feast Master",         "\uD83C\uDF72",       "100 feedings logged",          "pet", "Feeding", "feedingCount", 100),
  b("pet_feed_250",         "Banquet Baron",        "\uD83E\uDD58",       "250 feedings logged",          "pet", "Feeding", "feedingCount", 250),
  b("pet_feed_500",         "Feeding Deity",        "\uD83C\uDF1F",       "500 feedings logged",          "pet", "Feeding", "feedingCount", 500),
];

const petMedication: BadgeDefinition[] = [
  b("pet_first_med",        "First Dose",           "\uD83D\uDC8A", "First medication given",          "pet", "Medication", "medicationCount", 1),
  b("med_champion",         "Med Champion",         "\uD83D\uDC8A", "10 medications given",            "pet", "Medication", "medicationCount", 10),
  b("pet_med_25",           "Med Regular",          "\uD83E\uDDEA", "25 medications given",            "pet", "Medication", "medicationCount", 25),
  b("pet_med_50",           "Med Expert",           "\u2695\uFE0F", "50 medications given",            "pet", "Medication", "medicationCount", 50),
  b("pet_med_100",          "Med Centurion",        "\uD83C\uDFE5", "100 medications given",           "pet", "Medication", "medicationCount", 100),
  b("pet_med_250",          "Med Sage",             "\uD83E\uDDEC", "250 medications given",           "pet", "Medication", "medicationCount", 250),
];

const petActivity: BadgeDefinition[] = [
  b("pet_first_activity",   "First Outing",         "\uD83C\uDFC3", "First activity completed",        "pet", "Activities", "activityCount", 1),
  b("active_pal",           "Active Pal",           "\uD83C\uDFC3", "10 activities completed",         "pet", "Activities", "activityCount", 10),
  b("pet_activity_25",      "Adventure Buddy",      "\uD83E\uDDB8", "25 activities completed",         "pet", "Activities", "activityCount", 25),
  b("pet_activity_50",      "Explorer",             "\uD83C\uDFDE\uFE0F", "50 activities completed",   "pet", "Activities", "activityCount", 50),
  b("pet_activity_100",     "Adventure Hero",       "\uD83C\uDFC5", "100 activities completed",        "pet", "Activities", "activityCount", 100),
  b("pet_activity_250",     "Expedition Legend",    "\uD83E\uDD47", "250 activities completed",        "pet", "Activities", "activityCount", 250),
];

const petStreaks: BadgeDefinition[] = [
  b("pet_3_streak",         "Pet Warmup",           "\uD83D\uDD25", "3-day care streak",               "pet", "Streaks", "longestStreak", 3),
  b("pampered_pet",         "Pampered Pet",         "\uD83D\uDC51", "7-day care streak",               "pet", "Streaks", "longestStreak", 7),
  b("pet_14_streak",        "Devoted Care",         "\uD83D\uDCAA", "14-day care streak",              "pet", "Streaks", "longestStreak", 14),
  b("pet_30_streak",        "Monthly Care",         "\uD83C\uDFC6", "30-day care streak",              "pet", "Streaks", "longestStreak", 30),
  b("pet_60_streak",        "Care Marathon",        "\u26A1",       "60-day care streak",              "pet", "Streaks", "longestStreak", 60),
  b("pet_90_streak",        "Care Legend",          "\uD83D\uDC8E", "90-day care streak",              "pet", "Streaks", "longestStreak", 90),
  b("pet_180_streak",       "Half Year Pet",        "\uD83C\uDF1F", "180-day care streak",             "pet", "Streaks", "longestStreak", 180),
  b("pet_365_streak",       "Year of Love",         "\uD83D\uDC51", "365-day care streak",             "pet", "Streaks", "longestStreak", 365),
];

const petLevels: BadgeDefinition[] = [
  b("pet_level_5",          "Rising Star",          "\uD83C\uDF1F", "Pet reaches level 5",             "pet", "Levels", "level", 5),
  b("pet_level_10",         "Seasoned Pet",         "\u2B50",       "Pet reaches level 10",            "pet", "Levels", "level", 10),
  b("pet_level_25",         "Silver Pet",           "\uD83E\uDD48", "Pet reaches level 25",            "pet", "Levels", "level", 25),
  b("pet_level_50",         "Gold Pet",             "\uD83E\uDD47", "Pet reaches level 50",            "pet", "Levels", "level", 50),
  b("pet_level_75",         "Platinum Pet",         "\uD83D\uDC8E", "Pet reaches level 75",            "pet", "Levels", "level", 75),
  b("pet_level_100",        "Diamond Pet",          "\uD83D\uDC51", "Pet reaches level 100",           "pet", "Levels", "level", 100),
];

// ═══════════════════════════════════════════════
// COMBINED EXPORT
// ═══════════════════════════════════════════════

export const GAMIFICATION_BADGES: BadgeDefinition[] = [
  // Member (~57)
  ...memberMilestones,
  ...memberFeeding,
  ...memberMedication,
  ...memberActivity,
  ...memberStreaks,
  ...memberLevels,
  // Household (~40)
  ...householdMilestones,
  ...householdStreaks,
  ...householdMembers,
  ...householdLevels,
  // Pet (~52)
  ...petMilestones,
  ...petFeeding,
  ...petMedication,
  ...petActivity,
  ...petStreaks,
  ...petLevels,
];

/** Ordered list of badge categories for UI rendering */
export const BADGE_CATEGORIES = [
  "Milestones", "Feeding", "Medication", "Activities", "Streaks", "Levels", "Members",
] as const;

/** Evaluate which badges are earned for a given group + stats */
export function evaluateBadges(
  group: GamificationGroup,
  stats: {
    totalTasks: number;
    feedingCount: number;
    medicationCount: number;
    activityCount: number;
    longestStreak: number;
    level: number;
    activeMemberCount?: number;
  },
): string[] {
  const earned: string[] = [];
  const groupBadges = GAMIFICATION_BADGES.filter((badge) => badge.group === group);

  for (const badge of groupBadges) {
    const unlocked = badge.rules.every((rule) => {
      const val = rule.field === "activeMemberCount"
        ? (stats.activeMemberCount ?? 0)
        : stats[rule.field];
      return rule.op === ">=" ? val >= rule.value : val === rule.value;
    });
    if (unlocked) earned.push(badge.id);
  }

  return earned;
}
