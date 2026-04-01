import { eq, and, isNull } from "drizzle-orm";
import {
  db,
  memberGameStats,
  householdGameStats,
  petGameStats,
  achievements,
  memberAchievements,
  gamificationConfig,
} from "@petforce/db";
import { GAMIFICATION_XP_VALUES, evaluateBadges } from "@petforce/core";
import { levelFromXp } from "./gamification-helpers.js";
import { invalidateActivities } from "./cache.js";
import { logger } from "./logger.js";

export type TaskType = "feeding" | "medication" | "activity";

export interface XpAwardResult {
  xpAwarded: number;
  newLevel: number;
  newBadges: string[];
}

/**
 * Award XP inline when an activity, feeding, or medication is completed.
 * Updates memberGameStats, petGameStats, and householdGameStats.
 * Evaluates level-based badges and records newly unlocked achievements.
 *
 * Non-blocking: if this fails, the main mutation still succeeds.
 * The periodic recalculate remains the authoritative source for streaks
 * and task-count-based badges.
 */
export async function awardXp(opts: {
  householdId: string;
  memberId: string;
  petId: string | null;
  taskType: TaskType;
}): Promise<XpAwardResult> {
  const { householdId, memberId, petId, taskType } = opts;
  const xp = await resolveXpValue(householdId, taskType);
  const today = new Date().toISOString().split("T")[0];

  try {
    // --- Member stats: select then insert or update ---
    const [existingMember] = await db
      .select()
      .from(memberGameStats)
      .where(eq(memberGameStats.memberId, memberId));

    let newTotalXp: number;
    if (existingMember) {
      newTotalXp = existingMember.totalXp + xp;
      await db
        .update(memberGameStats)
        .set({
          totalXp: newTotalXp,
          level: levelFromXp(newTotalXp),
          lastActiveDate: today,
          updatedAt: new Date(),
        })
        .where(eq(memberGameStats.memberId, memberId));
    } else {
      newTotalXp = xp;
      await db.insert(memberGameStats).values({
        memberId,
        householdId,
        totalXp: xp,
        level: levelFromXp(xp),
        lastActiveDate: today,
      });
    }

    const newLevel = levelFromXp(newTotalXp);

    // --- Household stats ---
    const [existingHousehold] = await db
      .select()
      .from(householdGameStats)
      .where(eq(householdGameStats.householdId, householdId));

    if (existingHousehold) {
      const hXp = existingHousehold.totalXp + xp;
      await db
        .update(householdGameStats)
        .set({
          totalXp: hXp,
          level: levelFromXp(hXp),
          lastActiveDate: today,
          updatedAt: new Date(),
        })
        .where(eq(householdGameStats.householdId, householdId));
    } else {
      await db.insert(householdGameStats).values({
        householdId,
        totalXp: xp,
        level: levelFromXp(xp),
        lastActiveDate: today,
      });
    }

    // --- Pet stats ---
    if (petId) {
      const [existingPet] = await db
        .select()
        .from(petGameStats)
        .where(eq(petGameStats.petId, petId));

      if (existingPet) {
        const pXp = existingPet.totalXp + xp;
        await db
          .update(petGameStats)
          .set({
            totalXp: pXp,
            level: levelFromXp(pXp),
            lastActiveDate: today,
            updatedAt: new Date(),
          })
          .where(eq(petGameStats.petId, petId));
      } else {
        await db.insert(petGameStats).values({
          petId,
          householdId,
          totalXp: xp,
          level: levelFromXp(xp),
          lastActiveDate: today,
        });
      }
    }

    // --- Badge evaluation ---
    // Inline path evaluates level-based badges only.
    // Task-count and streak badges are handled by periodic recalculate.
    const newBadges = await evaluateNewBadges(memberId, householdId, newLevel);

    // Bust caches so UI shows updated stats
    await invalidateActivities(householdId);

    return { xpAwarded: xp, newLevel, newBadges };
  } catch (err) {
    // XP award must never break the main mutation
    logger.error({ err, ...opts }, "Failed to award XP inline");
    return { xpAwarded: 0, newLevel: 0, newBadges: [] };
  }
}

/**
 * Check if the member earned any new level-based badges.
 * Records newly unlocked achievements in the database.
 */
async function evaluateNewBadges(
  memberId: string,
  householdId: string,
  level: number,
): Promise<string[]> {
  const [stats] = await db
    .select()
    .from(memberGameStats)
    .where(eq(memberGameStats.memberId, memberId));

  if (!stats) return [];

  const currentBadgeIds = (stats.unlockedBadgeIds as string[]) ?? [];

  // Evaluate with level and streak data only.
  // Task-count fields are zero — those badges require full recalculate.
  const earnedBadgeIds = evaluateBadges("member", {
    totalTasks: 0,
    feedingCount: 0,
    medicationCount: 0,
    activityCount: 0,
    longestStreak: stats.longestStreak,
    level,
  });

  const newBadgeIds = earnedBadgeIds.filter((id) => !currentBadgeIds.includes(id));

  if (newBadgeIds.length > 0) {
    const allBadgeIds = [...currentBadgeIds, ...newBadgeIds];
    await db
      .update(memberGameStats)
      .set({ unlockedBadgeIds: allBadgeIds, updatedAt: new Date() })
      .where(eq(memberGameStats.memberId, memberId));

    // Record in memberAchievements for the achievements query
    const allAchievements = await db
      .select({ id: achievements.id, badgeId: achievements.badgeId })
      .from(achievements);

    const matchingAchievements = allAchievements.filter((a) =>
      newBadgeIds.includes(a.badgeId),
    );

    if (matchingAchievements.length > 0) {
      await db
        .insert(memberAchievements)
        .values(
          matchingAchievements.map((a) => ({
            memberId,
            householdId,
            achievementId: a.id,
          })),
        )
        .onConflictDoNothing();
    }
  }

  return newBadgeIds;
}

/**
 * Resolve XP value for a task type, checking the gamificationConfig table first.
 * Falls back to hardcoded GAMIFICATION_XP_VALUES if no config row exists.
 */
async function resolveXpValue(householdId: string, taskType: TaskType): Promise<number> {
  try {
    // Check household-specific config first, then global
    const [householdRow] = await db
      .select()
      .from(gamificationConfig)
      .where(
        and(
          eq(gamificationConfig.householdId, householdId),
          eq(gamificationConfig.key, "xp_values"),
        ),
      );

    if (householdRow) {
      const values = householdRow.value as Record<string, number>;
      if (typeof values[taskType] === "number") return values[taskType];
    }

    // Check global config
    const [globalRow] = await db
      .select()
      .from(gamificationConfig)
      .where(
        and(
          isNull(gamificationConfig.householdId),
          eq(gamificationConfig.key, "xp_values"),
        ),
      );

    if (globalRow) {
      const values = globalRow.value as Record<string, number>;
      if (typeof values[taskType] === "number") return values[taskType];
    }
  } catch {
    // Fall through to hardcoded defaults
  }

  return GAMIFICATION_XP_VALUES[taskType] ?? 10;
}
