import { z } from "zod";

/**
 * Shared pagination input schema for list endpoints.
 * - limit: number of rows to return (1..500, default 50)
 * - offset: number of rows to skip (>= 0, default 0)
 */
export const paginationInput = z.object({
  limit: z.number().int().min(1).max(500).default(50),
  offset: z.number().int().min(0).default(0),
});

/**
 * Standard paginated response shape returned by all list endpoints.
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
}
