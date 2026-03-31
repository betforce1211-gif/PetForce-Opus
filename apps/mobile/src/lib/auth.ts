import { useAuth as useClerkAuth } from "@clerk/clerk-expo";

export interface AuthState {
  isSignedIn: boolean;
  userId: string | null;
  getToken: () => Promise<string | null>;
}

export function useAuth(): AuthState {
  const { isSignedIn, userId, getToken } = useClerkAuth();
  return {
    isSignedIn: isSignedIn ?? false,
    userId: userId ?? null,
    getToken,
  };
}
