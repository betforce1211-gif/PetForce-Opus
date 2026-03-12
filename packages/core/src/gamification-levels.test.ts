import { describe, it, expect } from "vitest";
import { GAMIFICATION_LEVELS, GAMIFICATION_LEVEL_NAMES } from "./gamification-levels";

describe("GAMIFICATION_LEVELS", () => {
  it("has exactly 100 levels", () => {
    expect(GAMIFICATION_LEVELS).toHaveLength(100);
  });

  it("level 1 has threshold 0", () => {
    expect(GAMIFICATION_LEVELS[0].level).toBe(1);
    expect(GAMIFICATION_LEVELS[0].xpThreshold).toBe(0);
  });

  it("thresholds are monotonically increasing", () => {
    for (let i = 1; i < GAMIFICATION_LEVELS.length; i++) {
      expect(GAMIFICATION_LEVELS[i].xpThreshold).toBeGreaterThan(
        GAMIFICATION_LEVELS[i - 1].xpThreshold
      );
    }
  });

  it("XP formula matches round(15 * level^2) for spot-checked levels", () => {
    // Level 2: round(15 * 4) = 60
    expect(GAMIFICATION_LEVELS[1].xpThreshold).toBe(60);
    // Level 10: round(15 * 100) = 1500
    expect(GAMIFICATION_LEVELS[9].xpThreshold).toBe(1500);
    // Level 50: round(15 * 2500) = 37500
    expect(GAMIFICATION_LEVELS[49].xpThreshold).toBe(37500);
    // Level 100: round(15 * 10000) = 150000
    expect(GAMIFICATION_LEVELS[99].xpThreshold).toBe(150000);
  });
});

describe("GAMIFICATION_LEVEL_NAMES", () => {
  const expectedTracks = ["member", "household", "dog", "cat", "bird", "fish", "reptile", "other"];

  it("has entries for all 8 tracks", () => {
    for (const track of expectedTracks) {
      expect(GAMIFICATION_LEVEL_NAMES).toHaveProperty(track);
    }
  });

  it("each track has exactly 100 names", () => {
    for (const track of expectedTracks) {
      expect(GAMIFICATION_LEVEL_NAMES[track]).toHaveLength(100);
    }
  });

  it("no track has empty name strings", () => {
    for (const track of expectedTracks) {
      for (const name of GAMIFICATION_LEVEL_NAMES[track]) {
        expect(name.length).toBeGreaterThan(0);
      }
    }
  });
});
