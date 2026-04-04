import { useState, useCallback } from "react";

export interface XpRewardData {
  xpAwarded: number;
  newLevel: number;
  newBadges: string[];
}

interface XpRewardState {
  /** Currently visible XP toast data */
  xpToast: { xp: number } | null;
  /** Level-up modal data */
  levelUp: { level: number } | null;
  /** Badge unlock overlay data */
  badgeUnlock: { badgeIds: string[] } | null;
}

/**
 * Manages the XP reward celebration flow.
 * Call `handleXpReward` with the mutation response to trigger
 * XP toast → level-up modal → badge unlock overlay in sequence.
 */
export function useXpReward() {
  const [state, setState] = useState<XpRewardState>({
    xpToast: null,
    levelUp: null,
    badgeUnlock: null,
  });

  const handleXpReward = useCallback((data: XpRewardData) => {
    if (!data.xpAwarded) return;

    // Show XP toast immediately
    setState((prev) => ({ ...prev, xpToast: { xp: data.xpAwarded } }));

    // Queue level-up and badge unlocks after toast auto-dismisses
    if (data.newLevel > 0) {
      setTimeout(() => {
        setState((prev) => ({ ...prev, levelUp: { level: data.newLevel } }));
      }, 2000);
    }

    if (data.newBadges.length > 0) {
      const delay = data.newLevel > 0 ? 4000 : 2000;
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          badgeUnlock: { badgeIds: data.newBadges },
        }));
      }, delay);
    }
  }, []);

  const dismissXpToast = useCallback(() => {
    setState((prev) => ({ ...prev, xpToast: null }));
  }, []);

  const dismissLevelUp = useCallback(() => {
    setState((prev) => ({ ...prev, levelUp: null }));
  }, []);

  const dismissBadgeUnlock = useCallback(() => {
    setState((prev) => ({ ...prev, badgeUnlock: null }));
  }, []);

  return {
    ...state,
    handleXpReward,
    dismissXpToast,
    dismissLevelUp,
    dismissBadgeUnlock,
  };
}
