"use client";

import { useEffect, useRef } from "react";

/**
 * Hook that triggers a refetch when the browser tab becomes visible again.
 * Ensures household members see fresh data when switching back to the app.
 */
export function useVisibilityRefetch(refetchFns: Array<() => void>) {
  const fnsRef = useRef(refetchFns);
  useEffect(() => {
    fnsRef.current = refetchFns;
  });

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        for (const fn of fnsRef.current) {
          fn();
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);
}
