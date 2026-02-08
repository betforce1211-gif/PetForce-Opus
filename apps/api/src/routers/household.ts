import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, householdProcedure, router } from "../trpc";
import { db, households, members } from "@petforce/db";
import { createHouseholdSchema, updateHouseholdSchema } from "@petforce/core";
import { generateJoinCode } from "../utils/join-code";

export const householdRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userMemberships = await db
      .select()
      .from(members)
      .where(eq(members.userId, ctx.userId));

    if (userMemberships.length === 0) return [];

    const results = [];
    for (const membership of userMemberships) {
      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.id, membership.householdId));
      if (household) results.push(household);
    }
    return results;
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
    .mutation(async ({ ctx, input }) => {
      const [household] = await db
        .insert(households)
        .values({
          name: input.name,
          joinCode: generateJoinCode(),
          theme: input.theme ?? {
            primaryColor: "#6366F1",
            secondaryColor: "#EC4899",
            avatar: null,
          },
        })
        .returning();

      await db.insert(members).values({
        householdId: household.id,
        userId: ctx.userId,
        role: "owner",
        displayName: "Owner",
      });

      return household;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(updateHouseholdSchema))
    .mutation(async ({ input }) => {
      const { id, theme, ...rest } = input;

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

  regenerateJoinCode: householdProcedure.mutation(async ({ ctx }) => {
    if (ctx.membership.role !== "owner") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only owners can regenerate the join code",
      });
    }

    const [household] = await db
      .update(households)
      .set({ joinCode: generateJoinCode(), updatedAt: new Date() })
      .where(eq(households.id, ctx.householdId))
      .returning();

    return household;
  }),
});
