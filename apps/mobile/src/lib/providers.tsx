import { useState, useCallback, useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { TamaguiProvider } from "tamagui";
import { tamaguiConfig } from "@petforce/ui";
import superjson from "superjson";
import { trpc } from "./trpc";
import { AuthContext, type AuthState } from "./auth";
import { HouseholdContext } from "./household";
import { Platform } from "react-native";

// On Android emulator, localhost maps to 10.0.2.2; on iOS sim, use 127.0.0.1
const API_HOST = Platform.select({
  android: "10.0.2.2",
  default: "127.0.0.1",
});
const API_URL = `http://${API_HOST}:3001/trpc`;

// Module-level ref for latest getToken (same pattern as web)
let latestGetToken: (() => Promise<string | null>) | null = null;

export function AppProviders({ children }: { children: ReactNode }) {
  // TODO: Replace with Clerk auth when @clerk/clerk-expo is added
  const [auth] = useState<AuthState>({
    isSignedIn: false,
    userId: null,
    getToken: async () => null,
  });

  const [householdId, setHouseholdId] = useState<string | null>(null);

  useEffect(() => {
    latestGetToken = auth.getToken;
  });

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 2, retryDelay: 500 },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          transformer: superjson,
          url: API_URL,
          async headers() {
            const token = latestGetToken ? await latestGetToken() : null;
            return token ? { authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    })
  );

  return (
    <AuthContext.Provider value={auth}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <TamaguiProvider config={tamaguiConfig as any}>
            <HouseholdContext.Provider value={{ householdId, setHouseholdId }}>
              {children}
            </HouseholdContext.Provider>
          </TamaguiProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </AuthContext.Provider>
  );
}
