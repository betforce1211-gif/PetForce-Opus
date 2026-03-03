"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";

interface HouseholdContextValue {
  householdId: string | null;
  switchHousehold: (id: string) => void;
  clearHousehold: () => void;
}

const HouseholdContext = createContext<HouseholdContextValue>({
  householdId: null,
  switchHousehold: () => {},
  clearHousehold: () => {},
});

const STORAGE_KEY = "petforce_household_id";

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [householdId, setHouseholdId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setHouseholdId(stored);
  }, []);

  const switchHousehold = useCallback((id: string) => {
    setHouseholdId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const clearHousehold = useCallback(() => {
    setHouseholdId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <HouseholdContext.Provider value={{ householdId, switchHousehold, clearHousehold }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  return useContext(HouseholdContext);
}
