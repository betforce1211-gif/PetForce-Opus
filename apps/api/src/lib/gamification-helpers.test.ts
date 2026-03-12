import { describe, it, expect } from "vitest";
import {
  levelFromXp,
  levelName,
  nextLevelXp,
  currentLevelXp,
  computeStreaks,
  buildLevelView,
} from "./gamification-helpers";

describe("levelFromXp", () => {
  it("returns 1 for 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("returns 1 for XP below level 2 threshold", () => {
    expect(levelFromXp(59)).toBe(1);
  });

  it("returns 2 at exactly 60 XP (15 * 2^2)", () => {
    expect(levelFromXp(60)).toBe(2);
  });

  it("returns 10 at 1500 XP", () => {
    expect(levelFromXp(1500)).toBe(10);
  });

  it("returns 100 (max) for very high XP", () => {
    expect(levelFromXp(999999)).toBe(100);
  });

  it("returns correct level at exact threshold boundaries", () => {
    // Level 50 threshold: 15 * 50^2 = 37500
    expect(levelFromXp(37500)).toBe(50);
    expect(levelFromXp(37499)).toBe(49);
  });
});

describe("levelName", () => {
  it("returns dog track name for level 1", () => {
    expect(levelName(1, "dog")).toBe("Puppy Pal");
  });

  it("returns member track name for level 1", () => {
    expect(levelName(1, "member")).toBe("Helping Hand");
  });

  it("falls back to 'other' track when no track specified", () => {
    expect(levelName(1)).toBe("Pet Pal");
  });

  it("falls back to 'other' track for unknown track", () => {
    expect(levelName(1, "hamster")).toBe("Pet Pal");
  });

  it("returns 'Level N' for out-of-range level", () => {
    expect(levelName(101, "dog")).toBe("Level 101");
  });
});

describe("nextLevelXp", () => {
  it("returns level 2 threshold for level 1", () => {
    expect(nextLevelXp(1)).toBe(60);
  });

  it("returns max level threshold for level 100 (no next level)", () => {
    expect(nextLevelXp(100)).toBe(150000);
  });
});

describe("currentLevelXp", () => {
  it("returns 0 for level 1", () => {
    expect(currentLevelXp(1)).toBe(0);
  });

  it("returns 60 for level 2", () => {
    expect(currentLevelXp(2)).toBe(60);
  });

  it("returns 0 for invalid level", () => {
    expect(currentLevelXp(0)).toBe(0);
  });
});

describe("computeStreaks", () => {
  it("returns zeros for empty set", () => {
    expect(computeStreaks(new Set(), "2026-03-12")).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastDay: null,
    });
  });

  it("returns streak of 1 for single day that is today", () => {
    const result = computeStreaks(new Set(["2026-03-12"]), "2026-03-12");
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.lastDay).toBe("2026-03-12");
  });

  it("returns streak of 1 for single day that is yesterday", () => {
    const result = computeStreaks(new Set(["2026-03-11"]), "2026-03-12");
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
  });

  it("returns currentStreak 0 when last active day is more than 1 day ago", () => {
    const result = computeStreaks(new Set(["2026-03-10"]), "2026-03-12");
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(1);
  });

  it("computes 3-day consecutive streak", () => {
    const days = new Set(["2026-03-10", "2026-03-11", "2026-03-12"]);
    const result = computeStreaks(days, "2026-03-12");
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });

  it("preserves longest streak after a gap", () => {
    const days = new Set([
      "2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05",
      // gap
      "2026-03-10", "2026-03-11", "2026-03-12",
    ]);
    const result = computeStreaks(days, "2026-03-12");
    expect(result.longestStreak).toBe(5);
    expect(result.currentStreak).toBe(3);
  });

  it("handles unordered input (sorts internally)", () => {
    const days = new Set(["2026-03-12", "2026-03-10", "2026-03-11"]);
    const result = computeStreaks(days, "2026-03-12");
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });
});

describe("buildLevelView", () => {
  it("returns correct view for 0 XP", () => {
    const view = buildLevelView(0, "dog");
    expect(view.level).toBe(1);
    expect(view.levelName).toBe("Puppy Pal");
    expect(view.xpToNextLevel).toBe(60); // 60 - 0
    expect(view.nextLevelXp).toBe(60);   // 60 - 0
  });

  it("returns correct view mid-level", () => {
    const view = buildLevelView(30, "member");
    expect(view.level).toBe(1);
    expect(view.xpToNextLevel).toBe(30); // 60 - 30
  });

  it("returns correct view at max level", () => {
    const view = buildLevelView(150000, "cat");
    expect(view.level).toBe(100);
    expect(view.xpToNextLevel).toBe(0);
  });
});
