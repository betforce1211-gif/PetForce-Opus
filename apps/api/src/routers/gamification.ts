import { eq, desc, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { householdProcedure, router } from "../trpc.js";
import {
  db,
  members,
  memberGameStats,
  householdGameStats,
  petGameStats,
  pets,
  households,
  feedingSchedules,
  medications,
  achievements,
  memberAchievements,
} from "@petforce/db";
import {
  GAMIFICATION_XP_VALUES,
  GAMIFICATION_BADGES,
  evaluateBadges,
  leaderboardInputSchema,
  memberAchievementsInputSchema,
  recentAchievementsInputSchema,
} from "@petforce/core";
import type {
  GamificationMemberView,
  GamificationHouseholdView,
  GamificationPetView,
  GamificationFullStats,
} from "@petforce/core";
import { fetchUnifiedCompletions } from "../lib/unified-completions.js";
import { levelFromXp, buildLevelView, computeStreaks } from "../lib/gamification-helpers.js";
import { cache, cacheKey, CACHE_TTL } from "../lib/cache.js";

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
    // Cache: gamification stats are expensive (5+ queries)
    const key = cacheKey.gamificationStats(ctx.householdId);
    const cached = await cache.get<GamificationFullStats>(key);
    if (cached) return { ...cached, currentUserId: ctx.userId };

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
      const lv = buildLevelView(xp, "member");
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
    const hLv = buildLevelView(hXp, "household");
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
      const pLv = buildLevelView(pXp, p.species);
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
    await cache.set(key, result, CACHE_TTL.gamificationStats);
    return result;
  }),

  recalculate: householdProcedure.mutation(async ({ ctx }) => {
    const today = new Date().toISOString().split("T")[0];

    // Pre-fetch lookup data and existing stats in parallel
    const [householdMembers, petRows, schedules, meds, existingMemberStats, existingHouseholdStats, existingPetStats, allAchievements, existingUnlocks] = await Promise.all([
      db.select().from(members).where(eq(members.householdId, ctx.householdId)),
      db.select().from(pets).where(eq(pets.householdId, ctx.householdId)),
      db.select().from(feedingSchedules).where(eq(feedingSchedules.householdId, ctx.householdId)),
      db.select().from(medications).where(eq(medications.householdId, ctx.householdId)),
      db.select().from(memberGameStats).where(eq(memberGameStats.householdId, ctx.householdId)),
      db.select().from(householdGameStats).where(eq(householdGameStats.householdId, ctx.householdId)),
      db.select().from(petGameStats).where(eq(petGameStats.householdId, ctx.householdId)),
      db.select({ id: achievements.id, badgeId: achievements.badgeId }).from(achievements),
      db.select({ memberId: memberAchievements.memberId, achievementId: memberAchievements.achievementId })
        .from(memberAchievements)
        .where(eq(memberAchievements.householdId, ctx.householdId)),
    ]);

    // Build lookup maps for achievement sync
    const achievementByBadgeId = new Map(allAchievements.map((a) => [a.badgeId, a.id]));
    const existingUnlockSet = new Set(existingUnlocks.map((u) => `${u.memberId}:${u.achievementId}`));
    const newUnlocks: { memberId: string; householdId: string; achievementId: string }[] = [];

    // Use lastActiveDate to bound the fetch instead of scanning from 2000-01-01.
    // 90-day buffer ensures streak continuity across recalculations.
    let startDate = "2000-01-01";
    if (existingMemberStats.length > 0) {
      const dates = existingMemberStats
        .map((s) => s.lastActiveDate)
        .filter(Boolean) as string[];
      if (dates.length > 0) {
        const earliest = dates.sort()[0];
        const d = new Date(earliest);
        d.setDate(d.getDate() - 90);
        startDate = d.toISOString().split("T")[0];
      }
    }

    const raw = await fetchUnifiedCompletions(ctx.householdId, startDate, today, {
      schedules,
      medications: meds,
    });

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

    // --- Upsert member stats (use pre-fetched existingMemberStats) ---
    const memberStatsMap = new Map(existingMemberStats.map((s) => [s.memberId, s]));
    const memberUpserts: Promise<unknown>[] = [];
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

      // Track newly unlocked achievements for memberAchievements table
      for (const bid of badgeIds) {
        const achId = achievementByBadgeId.get(bid);
        if (achId && !existingUnlockSet.has(`${memberId}:${achId}`)) {
          newUnlocks.push({ memberId, householdId: ctx.householdId, achievementId: achId });
        }
      }

      if (memberStatsMap.has(memberId)) {
        memberUpserts.push(
          db.update(memberGameStats)
            .set({
              totalXp: data.totalXp,
              level,
              currentStreak,
              longestStreak,
              lastActiveDate: lastDay,
              unlockedBadgeIds: badgeIds,
              updatedAt: new Date(),
            })
            .where(eq(memberGameStats.memberId, memberId))
        );
      } else {
        memberUpserts.push(
          db.insert(memberGameStats).values({
            memberId,
            householdId: ctx.householdId,
            totalXp: data.totalXp,
            level,
            currentStreak,
            longestStreak,
            lastActiveDate: lastDay,
            unlockedBadgeIds: badgeIds,
          })
        );
      }
    }

    // --- Upsert household stats (use pre-fetched existingHouseholdStats) ---
    const householdUpserts: Promise<unknown>[] = [];
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

      if (existingHouseholdStats.length > 0) {
        householdUpserts.push(
          db.update(householdGameStats)
            .set({
              totalXp: householdAcc.totalXp,
              level,
              currentStreak,
              longestStreak,
              lastActiveDate: lastDay,
              unlockedBadgeIds: badgeIds,
              updatedAt: new Date(),
            })
            .where(eq(householdGameStats.householdId, ctx.householdId))
        );
      } else {
        householdUpserts.push(
          db.insert(householdGameStats).values({
            householdId: ctx.householdId,
            totalXp: householdAcc.totalXp,
            level,
            currentStreak,
            longestStreak,
            lastActiveDate: lastDay,
            unlockedBadgeIds: badgeIds,
          })
        );
      }
    }

    // --- Upsert pet stats (use pre-fetched existingPetStats) ---
    const petStatsMap = new Map(existingPetStats.map((s) => [s.petId, s]));
    const petUpserts: Promise<unknown>[] = [];
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

      if (petStatsMap.has(petId)) {
        petUpserts.push(
          db.update(petGameStats)
            .set({
              totalXp: data.totalXp,
              level,
              currentStreak,
              longestStreak,
              lastActiveDate: lastDay,
              unlockedBadgeIds: badgeIds,
              updatedAt: new Date(),
            })
            .where(eq(petGameStats.petId, petId))
        );
      } else {
        petUpserts.push(
          db.insert(petGameStats).values({
            petId,
            householdId: ctx.householdId,
            totalXp: data.totalXp,
            level,
            currentStreak,
            longestStreak,
            lastActiveDate: lastDay,
            unlockedBadgeIds: badgeIds,
          })
        );
      }
    }

    // Insert newly unlocked member achievements
    const achievementInserts: Promise<unknown>[] = [];
    if (newUnlocks.length > 0) {
      achievementInserts.push(
        db.insert(memberAchievements).values(newUnlocks).onConflictDoNothing()
      );
    }

    // Execute all upserts in parallel
    await Promise.all([...memberUpserts, ...householdUpserts, ...petUpserts, ...achievementInserts]);

    // Bust gamification cache after recalculation
    await cache.del(cacheKey.gamificationStats(ctx.householdId));

    return { success: true };
  }),

  /** Household leaderboard — members ranked by XP with level/streak info */
  leaderboard: householdProcedure
    .input(leaderboardInputSchema)
    .query(async ({ ctx, input }) => {
      const [householdMembers, gameStats] = await Promise.all([
        db.select().from(members).where(eq(members.householdId, ctx.householdId)),
        db.select().from(memberGameStats).where(eq(memberGameStats.householdId, ctx.householdId)),
      ]);

      const statsMap = new Map(gameStats.map((s) => [s.memberId, s]));
      const ranked = householdMembers
        .map((m) => {
          const gs = statsMap.get(m.id);
          const xp = gs?.totalXp ?? 0;
          const lv = buildLevelView(xp, "member");
          return {
            memberId: m.id,
            memberName: m.displayName,
            avatarUrl: m.avatarUrl,
            totalXp: xp,
            ...lv,
            currentStreak: gs?.currentStreak ?? 0,
            longestStreak: gs?.longestStreak ?? 0,
          };
        })
        .sort((a, b) => b.totalXp - a.totalXp)
        .slice(0, input.limit);

      // Assign ranks (1-indexed, ties share rank)
      let rank = 1;
      return ranked.map((entry, i) => {
        if (i > 0 && entry.totalXp < ranked[i - 1].totalXp) rank = i + 1;
        return { ...entry, rank };
      });
    }),

  /** List all available badge/achievement definitions, optionally filtered by group */
  achievements: householdProcedure
    .input(z.object({
      group: z.enum(["member", "household", "pet"]).optional(),
    }).default({}))
    .query(({ input }) => {
      const badges = input.group
        ? GAMIFICATION_BADGES.filter((b) => b.group === input.group)
        : GAMIFICATION_BADGES;
      return badges.map((b) => ({
        badgeId: b.id,
        name: b.name,
        icon: b.icon,
        description: b.description,
        group: b.group,
        category: b.category,
      }));
    }),

  /** Unlocked achievements for a specific member (defaults to current user) */
  memberAchievements: householdProcedure
    .input(memberAchievementsInputSchema)
    .query(async ({ ctx, input }) => {
      // Resolve target member
      let targetMemberId = input.memberId;
      if (!targetMemberId) {
        const [self] = await db
          .select({ id: members.id })
          .from(members)
          .where(
            and(
              eq(members.householdId, ctx.householdId),
              eq(members.userId, ctx.userId),
            ),
          );
        targetMemberId = self?.id;
        if (!targetMemberId) return [];
      }

      const rows = await db
        .select({
          achievementId: memberAchievements.achievementId,
          unlockedAt: memberAchievements.unlockedAt,
          badgeId: achievements.badgeId,
          name: achievements.name,
          description: achievements.description,
          icon: achievements.icon,
          group: achievements.group,
          category: achievements.category,
        })
        .from(memberAchievements)
        .innerJoin(achievements, eq(memberAchievements.achievementId, achievements.id))
        .where(
          and(
            eq(memberAchievements.memberId, targetMemberId),
            eq(memberAchievements.householdId, ctx.householdId),
          ),
        )
        .orderBy(desc(memberAchievements.unlockedAt));

      return rows;
    }),

  /** Recently unlocked achievements across the whole household */
  recentAchievements: householdProcedure
    .input(recentAchievementsInputSchema)
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select({
          memberId: memberAchievements.memberId,
          memberName: members.displayName,
          avatarUrl: members.avatarUrl,
          achievementId: memberAchievements.achievementId,
          unlockedAt: memberAchievements.unlockedAt,
          badgeId: achievements.badgeId,
          name: achievements.name,
          description: achievements.description,
          icon: achievements.icon,
          group: achievements.group,
          category: achievements.category,
        })
        .from(memberAchievements)
        .innerJoin(achievements, eq(memberAchievements.achievementId, achievements.id))
        .innerJoin(members, eq(memberAchievements.memberId, members.id))
        .where(eq(memberAchievements.householdId, ctx.householdId))
        .orderBy(desc(memberAchievements.unlockedAt))
        .limit(input.limit);

      return rows;
    }),
});
