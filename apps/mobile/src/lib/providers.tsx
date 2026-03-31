import { useState, useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { TamaguiProvider } from "tamagui";
import { tamaguiConfig } from "@petforce/ui";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import superjson from "superjson";
import { trpc } from "./trpc";
import { HouseholdContext } from "./household";
import { Platform } from "react-native";

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

// Clerk token cache backed by expo-secure-store
const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Silently fail — worst case the user re-authenticates
    }
  },
  async clearToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // noop
    }
  },
};

// On Android emulator, localhost maps to 10.0.2.2; on iOS sim, use 127.0.0.1
const API_HOST = Platform.select({
  android: "10.0.2.2",
  default: "127.0.0.1",
});
const API_URL = `http://${API_HOST}:3001/trpc`;

// Module-level ref for latest getToken (same pattern as web)
let latestGetToken: (() => Promise<string | null>) | null = null;

function InnerProviders({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const [householdId, setHouseholdId] = useState<string | null>(null);

  useEffect(() => {
    latestGetToken = getToken;
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
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <TamaguiProvider config={tamaguiConfig as any}>
          <HouseholdContext.Provider value={{ householdId, setHouseholdId }}>
            {children}
          </HouseholdContext.Provider>
        </TamaguiProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ClerkLoaded>
        <InnerProviders>{children}</InnerProviders>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
