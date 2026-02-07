"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc";
import superjson from "superjson";
import { HouseholdProvider } from "@/lib/household-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  // Use a ref so the headers callback always calls the latest getToken
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

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
      transformer: superjson,
      links: [
        httpBatchLink({
          url: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/trpc`,
          async headers() {
            const token = await getTokenRef.current();
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
