import { eq } from "drizzle-orm";
import { householdProcedure, router } from "../trpc";
import {
  db,
  members,
  memberGameStats,
  householdGameStats,
  petGameStats,
  pets,
  households,
} from "@petforce/db";
import {
  GAMIFICATION_LEVELS,
  GAMIFICATION_XP_VALUES,
  GAMIFICATION_BADGES,
} from "@petforce/core";
import type {
  GamificationMemberView,
  GamificationHouseholdView,
  GamificationPetView,
  GamificationFullStats,
  GamificationEntityGroup,
} from "@petforce/core";
import { fetchUnifiedCompletions } from "../lib/unified-completions";

function levelFromXp(xp: number): number {
  for (let i = GAMIFICATION_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= GAMIFICATION_LEVELS[i].xpThreshold) return GAMIFICATION_LEVELS[i].level;
  }
  return 1;
}

function levelName(level: number): string {
  return GAMIFICATION_LEVELS.find((l) => l.level === level)?.name ?? "Puppy Pal";
}

function nextLevelXp(level: number): number {
  const next = GAMIFICATION_LEVELS.find((l) => l.level === level + 1);
  return next ? next.xpThreshold : GAMIFICATION_LEVELS[GAMIFICATION_LEVELS.length - 1].xpThreshold;
}

function currentLevelXp(level: number): number {
  return GAMIFICATION_LEVELS.find((l) => l.level === level)?.xpThreshold ?? 0;
}

function computeStreaks(
  activeDays: Set<string>,
  today: string
): { currentStreak: number; longestStreak: number; lastDay: string | null } {
  const sortedDays = Array.from(activeDays).sort();
  if (sortedDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastDay: null };
  }

  let longestStreak = 1;
  let streakCount = 1;

  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      streakCount++;
    } else {
      streakCount = 1;
    }
    if (streakCount > longestStreak) longestStreak = streakCount;
  }

  const lastDay = sortedDays[sortedDays.length - 1];
  let currentStreak = 0;

  const lastDate = new Date(lastDay);
  const todayDate = new Date(today);
  const diffDays = (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 1) {
    currentStreak = 1;
    for (let i = sortedDays.length - 2; i >= 0; i--) {
      const prev = new Date(sortedDays[i]);
      const curr = new Date(sortedDays[i + 1]);
      const d = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (d === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return { currentStreak, longestStreak, lastDay };
}

function evaluateBadges(
  group: GamificationEntityGroup,
  stats: {
    totalTasks: number;
    feedingCount: number;
    medicationCount: number;
    activityCount: number;
    longestStreak: number;
    level: number;
    activeMemberCount?: number;
  }
): string[] {
  const earned: string[] = [];
  const groupBadges = GAMIFICATION_BADGES.filter((b) => b.group === group);

  for (const badge of groupBadges) {
    let unlocked = false;
    switch (badge.id) {
      // Member badges
      case "first_steps": unlocked = stats.totalTasks >= 1; break;
      case "feeding_frenzy": unlocked = stats.feedingCount >= 10; break;
      case "med_master": unlocked = stats.medicationCount >= 10; break;
      case "walk_star": unlocked = stats.activityCount >= 10; break;
      case "week_warrior": unlocked = stats.longestStreak >= 7; break;
      case "fortnight_hero": unlocked = stats.longestStreak >= 14; break;
      case "month_master": unlocked = stats.longestStreak >= 30; break;
      case "pet_parent_pro": unlocked = stats.level >= 5; break;
      case "century_club": unlocked = stats.totalTasks >= 100; break;
      case "feeding_fiend": unlocked = stats.feedingCount >= 50; break;
      // Household badges
      case "house_warming": unlocked = stats.totalTasks >= 1; break;
      case "full_house": unlocked = (stats.activeMemberCount ?? 0) >= 3; break;
      case "team_effort": unlocked = stats.longestStreak >= 7; break;
      case "family_commitment": unlocked = stats.longestStreak >= 30; break;
      case "century_home": unlocked = stats.totalTasks >= 100; break;
      case "dream_team": unlocked = stats.level >= 5; break;
      // Pet badges
      case "first_care": unlocked = stats.totalTasks >= 1; break;
      case "well_fed": unlocked = stats.feedingCount >= 10; break;
      case "med_champion": unlocked = stats.medicationCount >= 10; break;
      case "active_pal": unlocked = stats.activityCount >= 10; break;
      case "pampered_pet": unlocked = stats.longestStreak >= 7; break;
      case "vip_pet": unlocked = stats.totalTasks >= 100; break;
    }
    if (unlocked) earned.push(badge.id);
  }
  return earned;
}

function buildLevelView(xp: number) {
  const lvl = levelFromXp(xp);
  const nxtXp = nextLevelXp(lvl);
  const curXp = currentLevelXp(lvl);
  return {
    level: lvl,
    levelName: levelName(lvl),
    xpToNextLevel: nxtXp - xp,
    nextLevelXp: nxtXp - curXp,
  };
}

interface AccumulatorData {
  totalXp: number;
  feedingCount: number;
  medicationCount: number;
  activityCount: number;
  activeDays: Set<string>;
}

function emptyAccumulator(): AccumulatorData {
  return { totalXp: 0, feedingCount: 0, medicationCount: 0, activityCount: 0, activeDays: new Set() };
}

export const gamificationRouter = router({
  getStats: householdProcedure.query(async ({ ctx }) => {
    const [householdMembers, householdRows, gameStats, petRows, petStatsRows] =
      await Promise.all([
        db.select().from(members).where(eq(members.householdId, ctx.householdId)),
        db.select().from(households).where(eq(households.id, ctx.householdId)),
        db.select().from(memberGameStats).where(eq(memberGameStats.householdId, ctx.householdId)),
        db.select().from(pets).where(eq(pets.householdId, ctx.householdId)),
        db.select().from(petGameStats).where(eq(petGameStats.householdId, ctx.householdId)),
      ]);

    const householdRow = householdRows[0];

    // Member views
    const statsMap = new Map(gameStats.map((s) => [s.memberId, s]));
    const memberViews: GamificationMemberView[] = householdMembers.map((m) => {
      const gs = statsMap.get(m.id);
      const xp = gs?.totalXp ?? 0;
      const lv = buildLevelView(xp);
      return {
        memberId: m.id,
        memberName: m.displayName,
        avatarUrl: m.avatarUrl,
        totalXp: xp,
        ...lv,
        currentStreak: gs?.currentStreak ?? 0,
        longestStreak: gs?.longestStreak ?? 0,
        unlockedBadgeIds: gs?.unlockedBadgeIds ?? [],
        feedingCount: 0,
        medicationCount: 0,
        activityCount: 0,
      };
    });
    memberViews.sort((a, b) => b.totalXp - a.totalXp);

    // Household view
    const hStats = await db
      .select()
      .from(householdGameStats)
      .where(eq(householdGameStats.householdId, ctx.householdId));
    const hs = hStats[0];
    const hXp = hs?.totalXp ?? 0;
    const hLv = buildLevelView(hXp);
    const householdView: GamificationHouseholdView = {
      householdName: householdRow?.name ?? "Household",
      totalXp: hXp,
      ...hLv,
      currentStreak: hs?.currentStreak ?? 0,
      longestStreak: hs?.longestStreak ?? 0,
      unlockedBadgeIds: hs?.unlockedBadgeIds ?? [],
      activeMemberCount: householdMembers.length,
      totalTasks: 0,
    };

    // Pet views
    const petStatsMap = new Map(petStatsRows.map((s) => [s.petId, s]));
    const petViews: GamificationPetView[] = petRows.map((p) => {
      const ps = petStatsMap.get(p.id);
      const pXp = ps?.totalXp ?? 0;
      const pLv = buildLevelView(pXp);
      return {
        petId: p.id,
        petName: p.name,
        species: p.species,
        avatarUrl: p.avatarUrl,
        totalXp: pXp,
        ...pLv,
        currentStreak: ps?.currentStreak ?? 0,
        longestStreak: ps?.longestStreak ?? 0,
        unlockedBadgeIds: ps?.unlockedBadgeIds ?? [],
        feedingCount: 0,
        medicationCount: 0,
        activityCount: 0,
      };
    });
    petViews.sort((a, b) => b.totalXp - a.totalXp);

    const result: GamificationFullStats = {
      members: memberViews,
      household: householdView,
      pets: petViews,
      currentUserId: ctx.userId,
    };
    return result;
  }),

  recalculate: householdProcedure.mutation(async ({ ctx }) => {
    const today = new Date().toISOString().split("T")[0];
    const raw = await fetchUnifiedCompletions(ctx.householdId, "2000-01-01", today);

    const [householdMembers, petRows] = await Promise.all([
      db.select().from(members).where(eq(members.householdId, ctx.householdId)),
      db.select().from(pets).where(eq(pets.householdId, ctx.householdId)),
    ]);

    // --- Accumulators ---
    const memberData = new Map<string, AccumulatorData>();
    for (const m of householdMembers) {
      memberData.set(m.id, emptyAccumulator());
    }

    const petData = new Map<string, AccumulatorData>();
    for (const p of petRows) {
      petData.set(p.id, emptyAccumulator());
    }

    const householdAcc = emptyAccumulator();
    const activeMemberIds = new Set<string>();

    // --- Single pass ---
    for (const r of raw) {
      if (r.skipped) continue;

      const xp = GAMIFICATION_XP_VALUES[r.taskType] ?? 10;
      const dayStr = r.completedAt.toISOString().split("T")[0];

      // Member accumulation
      let mData = memberData.get(r.completedById);
      if (!mData) {
        mData = emptyAccumulator();
        memberData.set(r.completedById, mData);
      }
      mData.totalXp += xp;
      switch (r.taskType) {
        case "feeding": mData.feedingCount++; break;
        case "medication": mData.medicationCount++; break;
        case "activity": mData.activityCount++; break;
      }
      mData.activeDays.add(dayStr);

      // Pet accumulation
      if (r.petId) {
        let pData = petData.get(r.petId);
        if (!pData) {
          pData = emptyAccumulator();
          petData.set(r.petId, pData);
        }
        pData.totalXp += xp;
        switch (r.taskType) {
          case "feeding": pData.feedingCount++; break;
          case "medication": pData.medicationCount++; break;
          case "activity": pData.activityCount++; break;
        }
        pData.activeDays.add(dayStr);
      }

      // Household accumulation
      householdAcc.totalXp += xp;
      switch (r.taskType) {
        case "feeding": householdAcc.feedingCount++; break;
        case "medication": householdAcc.medicationCount++; break;
        case "activity": householdAcc.activityCount++; break;
      }
      householdAcc.activeDays.add(dayStr);
      activeMemberIds.add(r.completedById);
    }

    // --- Upsert member stats ---
    for (const [memberId, data] of memberData) {
      const level = levelFromXp(data.totalXp);
      const { currentStreak, longestStreak, lastDay } = computeStreaks(data.activeDays, today);
      const totalTasks = data.feedingCount + data.medicationCount + data.activityCount;
      const badgeIds = evaluateBadges("member", {
        totalTasks,
        feedingCount: data.feedingCount,
        medicationCount: data.medicationCount,
        activityCount: data.activityCount,
        longestStreak,
        level,
      });

      const existing = await db
        .select()
        .from(memberGameStats)
        .where(eq(memberGameStats.memberId, memberId));

      if (existing.length > 0) {
        await db
          .update(memberGameStats)
          .set({
            totalXp: data.totalXp,
            level,
            currentStreak,
            longestStreak,
            lastActiveDate: lastDay,
            unlockedBadgeIds: badgeIds,
            updatedAt: new Date(),
          })
          .where(eq(memberGameStats.memberId, memberId));
      } else {
        await db.insert(memberGameStats).values({
          memberId,
          householdId: ctx.householdId,
          totalXp: data.totalXp,
          level,
          currentStreak,
          longestStreak,
          lastActiveDate: lastDay,
          unlockedBadgeIds: badgeIds,
        });
      }
    }

    // --- Upsert household stats ---
    {
      const level = levelFromXp(householdAcc.totalXp);
      const { currentStreak, longestStreak, lastDay } = computeStreaks(householdAcc.activeDays, today);
      const totalTasks = householdAcc.feedingCount + householdAcc.medicationCount + householdAcc.activityCount;
      const badgeIds = evaluateBadges("household", {
        totalTasks,
        feedingCount: householdAcc.feedingCount,
        medicationCount: householdAcc.medicationCount,
        activityCount: householdAcc.activityCount,
        longestStreak,
        level,
        activeMemberCount: activeMemberIds.size,
      });

      const existing = await db
        .select()
        .from(householdGameStats)
        .where(eq(householdGameStats.householdId, ctx.householdId));

      if (existing.length > 0) {
        await db
          .update(householdGameStats)
          .set({
            totalXp: householdAcc.totalXp,
            level,
            currentStreak,
            longestStreak,
            lastActiveDate: lastDay,
            unlockedBadgeIds: badgeIds,
            updatedAt: new Date(),
          })
          .where(eq(householdGameStats.householdId, ctx.householdId));
      } else {
        await db.insert(householdGameStats).values({
          householdId: ctx.householdId,
          totalXp: householdAcc.totalXp,
          level,
          currentStreak,
          longestStreak,
          lastActiveDate: lastDay,
          unlockedBadgeIds: badgeIds,
        });
      }
    }

    // --- Upsert pet stats ---
    for (const [petId, data] of petData) {
      const level = levelFromXp(data.totalXp);
      const { currentStreak, longestStreak, lastDay } = computeStreaks(data.activeDays, today);
      const totalTasks = data.feedingCount + data.medicationCount + data.activityCount;
      const badgeIds = evaluateBadges("pet", {
        totalTasks,
        feedingCount: data.feedingCount,
        medicationCount: data.medicationCount,
        activityCount: data.activityCount,
        longestStreak,
        level,
      });

      const existing = await db
        .select()
        .from(petGameStats)
        .where(eq(petGameStats.petId, petId));

      if (existing.length > 0) {
        await db
          .update(petGameStats)
          .set({
            totalXp: data.totalXp,
            level,
            currentStreak,
            longestStreak,
            lastActiveDate: lastDay,
            unlockedBadgeIds: badgeIds,
            updatedAt: new Date(),
          })
          .where(eq(petGameStats.petId, petId));
      } else {
        await db.insert(petGameStats).values({
          petId,
          householdId: ctx.householdId,
          totalXp: data.totalXp,
          level,
          currentStreak,
          longestStreak,
          lastActiveDate: lastDay,
          unlockedBadgeIds: badgeIds,
        });
      }
    }

    return { success: true };
  }),
});
