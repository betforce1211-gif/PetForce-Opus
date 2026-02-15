"use client";

import { useCallback } from "react";
import { trpc } from "./trpc";
import { useHousehold } from "./household-context";

export function useTrackEvent() {
  const { householdId } = useHousehold();
  const trackMutation = trpc.analytics.track.useMutation();

  const trackEvent = useCallback(
    (eventName: string, metadata?: Record<string, unknown>) => {
      trackMutation.mutate(
        {
          eventName,
          householdId: householdId ?? undefined,
          metadata,
        },
        {
          onError: () => {
            // Silent — analytics must never break the UI
          },
        }
      );
    },
    [householdId, trackMutation]
  );

  return trackEvent;
}
