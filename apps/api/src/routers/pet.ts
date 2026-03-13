import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, householdProcedure, router, verifyMembership, requireAdmin } from "../trpc.js";
import { db, pets } from "@petforce/db";
import { createPetSchema, updatePetSchema, paginationInput } from "@petforce/core";

export const petRouter = router({
  listByHousehold: householdProcedure
    .input(paginationInput)
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(pets)
        .where(eq(pets.householdId, ctx.householdId))
        .orderBy(desc(pets.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [pet] = await db
        .select()
        .from(pets)
        .where(eq(pets.id, input.id));
      if (!pet) return null;

      await verifyMembership(pet.householdId, ctx.userId);

      return pet;
    }),

  create: householdProcedure
    .input(createPetSchema)
    .mutation(async ({ ctx, input }) => {
      const [pet] = await db
        .insert(pets)
        .values({ ...input, householdId: ctx.householdId })
        .returning();
      return pet;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(updatePetSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [pet] = await db.select().from(pets).where(eq(pets.id, id));
      if (!pet) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pet not found" });
      }

      await verifyMembership(pet.householdId, ctx.userId);

      const [updated] = await db
        .update(pets)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(pets.id, id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [pet] = await db.select().from(pets).where(eq(pets.id, input.id));
      if (!pet) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pet not found" });
      }

      const membership = await verifyMembership(pet.householdId, ctx.userId);
      requireAdmin(membership);

      await db.delete(pets).where(eq(pets.id, input.id));
      return { success: true };
    }),
});
