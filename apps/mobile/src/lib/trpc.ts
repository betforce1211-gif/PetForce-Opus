import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@petforce/api/types";

export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> =
  createTRPCReact<AppRouter>();
