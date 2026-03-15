import { z } from "zod";
import { householdProcedure, router } from "../trpc";
import { fullTextSearch } from "@petforce/db";
import type { SearchEntityType } from "@petforce/db";

const searchEntityTypes = ["pet", "activity", "note"] as const;

const searchInput = z.object({
  query: z.string().min(1).max(500),
  entityTypes: z.array(z.enum(searchEntityTypes)).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const searchRouter = router({
  query: householdProcedure
    .input(searchInput)
    .query(async ({ ctx, input }) => {
      const types = (input.entityTypes ?? [...searchEntityTypes]) as SearchEntityType[];

      const { items, totalCount } = await fullTextSearch({
        householdId: ctx.householdId,
        query: input.query,
        entityTypes: types,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        items: items.map((row) => ({
          id: row.id,
          entityType: row.entity_type,
          title: row.title,
          snippet: row.snippet,
          rank: row.rank,
          createdAt: new Date(row.created_at),
        })),
        totalCount,
      };
    }),
});
