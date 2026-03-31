import { createContext, useContext } from "react";

export interface AuthState {
  isSignedIn: boolean;
  userId: string | null;
  getToken: () => Promise<string | null>;
}

const defaultAuth: AuthState = {
  isSignedIn: false,
  userId: null,
  getToken: async () => null,
};

export const AuthContext = createContext<AuthState>(defaultAuth);

export function useAuth() {
  return useContext(AuthContext);
}
