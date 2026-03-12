import { GAMIFICATION_LEVELS, GAMIFICATION_LEVEL_NAMES } from "@petforce/core";

export function levelFromXp(xp: number): number {
  for (let i = GAMIFICATION_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= GAMIFICATION_LEVELS[i].xpThreshold) return GAMIFICATION_LEVELS[i].level;
  }
  return 1;
}

export function levelName(level: number, track?: string): string {
  if (track) {
    const names = GAMIFICATION_LEVEL_NAMES[track];
    if (names && names[level - 1]) return names[level - 1];
  }
  const otherNames = GAMIFICATION_LEVEL_NAMES["other"];
  return (otherNames && otherNames[level - 1]) ?? `Level ${level}`;
}

export function nextLevelXp(level: number): number {
  const next = GAMIFICATION_LEVELS.find((l) => l.level === level + 1);
  return next ? next.xpThreshold : GAMIFICATION_LEVELS[GAMIFICATION_LEVELS.length - 1].xpThreshold;
}

export function currentLevelXp(level: number): number {
  return GAMIFICATION_LEVELS.find((l) => l.level === level)?.xpThreshold ?? 0;
}

export function computeStreaks(
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

export function buildLevelView(xp: number, track?: string) {
  const lvl = levelFromXp(xp);
  const nxtXp = nextLevelXp(lvl);
  const curXp = currentLevelXp(lvl);
  return {
    level: lvl,
    levelName: levelName(lvl, track),
    xpToNextLevel: nxtXp - xp,
    nextLevelXp: nxtXp - curXp,
  };
}
