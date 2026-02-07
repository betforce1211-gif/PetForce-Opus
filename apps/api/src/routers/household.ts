import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../trpc";
import { db, households } from "@petforce/db";
import { createHouseholdSchema, updateHouseholdSchema } from "@petforce/core";

export const householdRouter = router({
  list: protectedProcedure.query(async () => {
    return db.select().from(households);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.id, input.id));
      return household ?? null;
    }),

  create: protectedProcedure
    .input(createHouseholdSchema)
    .mutation(async ({ input }) => {
      const [household] = await db
        .insert(households)
        .values({
          name: input.name,
          theme: input.theme ?? {
            primaryColor: "#6366F1",
            secondaryColor: "#EC4899",
            avatar: null,
          },
        })
        .returning();
      return household;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(updateHouseholdSchema))
    .mutation(async ({ input }) => {
      const { id, theme, ...rest } = input;

      // If theme partial fields are provided, merge with existing household theme
      const updateData: Record<string, unknown> = { ...rest, updatedAt: new Date() };
      if (theme) {
        const [existing] = await db
          .select()
          .from(households)
          .where(eq(households.id, id));
        if (existing) {
          updateData.theme = { ...existing.theme, ...theme };
        }
      }

      const [household] = await db
        .update(households)
        .set(updateData)
        .where(eq(households.id, id))
        .returning();
      return household;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(households).where(eq(households.id, input.id));
      return { success: true };
    }),
});
