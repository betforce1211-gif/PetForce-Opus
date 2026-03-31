import { z } from "zod";
import { eq, desc, count as drizzleCount } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, householdProcedure, router, verifyMembership, requireAdmin } from "../trpc.js";
import { db, pets } from "@petforce/db";
import { createPetSchema, updatePetSchema, paginationInput } from "@petforce/core";
import { invalidatePets } from "../lib/cache.js";

export const petRouter = router({
  listByHousehold: householdProcedure
    .input(paginationInput)
    .query(async ({ ctx, input }) => {
      const where = eq(pets.householdId, ctx.householdId);
      const [items, [{ count }]] = await Promise.all([
        db
          .select()
          .from(pets)
          .where(where)
          .orderBy(desc(pets.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: drizzleCount() }).from(pets).where(where),
      ]);
      return { items, totalCount: count };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.uuid() }))
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
      await invalidatePets(ctx.householdId);
      return pet;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.uuid(), ...updatePetSchema.shape }))
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
      await invalidatePets(pet.householdId);
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [pet] = await db.select().from(pets).where(eq(pets.id, input.id));
      if (!pet) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pet not found" });
      }

      const membership = await verifyMembership(pet.householdId, ctx.userId);
      requireAdmin(membership);

      await db.delete(pets).where(eq(pets.id, input.id));
      await invalidatePets(pet.householdId);
      return { success: true };
    }),
});
