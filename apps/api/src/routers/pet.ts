import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../trpc";
import { db, pets } from "@petforce/db";
import { createPetSchema, updatePetSchema } from "@petforce/core";

export const petRouter = router({
  listByHousehold: protectedProcedure
    .input(z.object({ householdId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(pets)
        .where(eq(pets.householdId, input.householdId));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [pet] = await db
        .select()
        .from(pets)
        .where(eq(pets.id, input.id));
      return pet ?? null;
    }),

  create: protectedProcedure
    .input(z.object({ householdId: z.string().uuid() }).merge(createPetSchema))
    .mutation(async ({ input }) => {
      const [pet] = await db.insert(pets).values(input).returning();
      return pet;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(updatePetSchema))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [pet] = await db
        .update(pets)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(pets.id, id))
        .returning();
      return pet;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(pets).where(eq(pets.id, input.id));
      return { success: true };
    }),
});
