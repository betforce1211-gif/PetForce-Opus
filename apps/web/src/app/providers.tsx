"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc";
import superjson from "superjson";
import { HouseholdProvider } from "@/lib/household-context";

// Module-level ref to hold the latest getToken function.
// This avoids reading a React ref during render while still allowing
// the tRPC client (created once in a useState initializer) to always
// call the most recent Clerk getToken.
let latestGetToken: (() => Promise<string | null>) | null = null;

export function Providers({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
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
          url: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/trpc`,
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
        <HouseholdProvider>{children}</HouseholdProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
