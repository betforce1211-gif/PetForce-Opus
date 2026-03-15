import { describe, it, expect } from "vitest";
import {
  GAMIFICATION_BADGES,
  BADGE_CATEGORIES,
  evaluateBadges,
} from "./gamification-badges";

describe("GAMIFICATION_BADGES data integrity", () => {
  it("has no duplicate badge IDs", () => {
    const ids = GAMIFICATION_BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every badge has at least one rule", () => {
    for (const badge of GAMIFICATION_BADGES) {
      expect(badge.rules.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("every badge belongs to a valid group", () => {
    const validGroups = ["member", "household", "pet"];
    for (const badge of GAMIFICATION_BADGES) {
      expect(validGroups).toContain(badge.group);
    }
  });

  it("every badge has a category from BADGE_CATEGORIES", () => {
    const cats = BADGE_CATEGORIES as readonly string[];
    for (const badge of GAMIFICATION_BADGES) {
      expect(cats).toContain(badge.category);
    }
  });

  it("has member, household, and pet badges", () => {
    const groups = new Set(GAMIFICATION_BADGES.map((b) => b.group));
    expect(groups).toEqual(new Set(["member", "household", "pet"]));
  });
});

describe("evaluateBadges", () => {
  const zeroStats = {
    totalTasks: 0,
    feedingCount: 0,
    medicationCount: 0,
    activityCount: 0,
    longestStreak: 0,
    level: 1,
  };

  it("returns empty array when all stats are zero", () => {
    expect(evaluateBadges("member", zeroStats)).toEqual([]);
  });

  it("returns first_steps when totalTasks >= 1 for member", () => {
    const result = evaluateBadges("member", { ...zeroStats, totalTasks: 1 });
    expect(result).toContain("first_steps");
  });

  it("returns multiple milestone badges for high totalTasks", () => {
    const result = evaluateBadges("member", { ...zeroStats, totalTasks: 100 });
    expect(result).toContain("first_steps");
    expect(result).toContain("high_five");
    expect(result).toContain("double_digits");
    expect(result).toContain("quarter_century");
    expect(result).toContain("half_century");
    expect(result).toContain("century_club");
    expect(result).not.toContain("power_250");
  });

  it("does not return member badges for pet group", () => {
    const result = evaluateBadges("pet", { ...zeroStats, totalTasks: 1000 });
    expect(result).not.toContain("first_steps");
    expect(result).toContain("first_care");
  });

  it("evaluates feeding badges independently", () => {
    const result = evaluateBadges("member", { ...zeroStats, feedingCount: 10 });
    expect(result).toContain("first_feeding");
    expect(result).toContain("feeding_frenzy");
    expect(result).not.toContain("feeding_pro");
  });

  it("evaluates streak badges", () => {
    const result = evaluateBadges("member", { ...zeroStats, longestStreak: 7 });
    expect(result).toContain("three_day_streak");
    expect(result).toContain("week_warrior");
    expect(result).not.toContain("fortnight_hero");
  });

  it("evaluates level badges", () => {
    const result = evaluateBadges("member", { ...zeroStats, level: 10 });
    expect(result).toContain("pet_parent_pro");
    expect(result).toContain("level_10_member");
    expect(result).not.toContain("level_25_member");
  });

  it("evaluates household badges with activeMemberCount", () => {
    const result = evaluateBadges("household", {
      ...zeroStats,
      totalTasks: 1,
      activeMemberCount: 3,
    });
    expect(result).toContain("house_warming");
    expect(result).toContain("duo_house");
    expect(result).toContain("full_house");
    expect(result).not.toContain("fab_five");
  });

  it("defaults activeMemberCount to 0 when omitted", () => {
    const result = evaluateBadges("household", { ...zeroStats, totalTasks: 1 });
    expect(result).toContain("house_warming");
    expect(result).not.toContain("duo_house");
  });
});
