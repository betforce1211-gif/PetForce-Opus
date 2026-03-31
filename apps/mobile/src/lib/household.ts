import { createContext, useContext } from "react";

export interface HouseholdState {
  householdId: string | null;
  setHouseholdId: (id: string | null) => void;
}

export const HouseholdContext = createContext<HouseholdState>({
  householdId: null,
  setHouseholdId: () => {},
});

export function useHousehold() {
  return useContext(HouseholdContext);
}
