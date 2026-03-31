import { eq, and, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, householdProcedure, router, requireAdmin, requireOwner } from "../trpc.js";
import { db, households, members } from "@petforce/db";
import { createHouseholdSchema, updateHouseholdSchema } from "@petforce/core";
import { generateJoinCode } from "../utils/join-code.js";
import { logActivity } from "../lib/audit.js";
import { invalidateHousehold, cache, cacheKey } from "../lib/cache.js";

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

  getById: householdProcedure.query(async ({ ctx }) => {
    const [household] = await db
      .select()
      .from(households)
      .where(eq(households.id, ctx.householdId));
    return household ?? null;
  }),

  create: protectedProcedure
    .input(createHouseholdSchema)
    .mutation(async ({ ctx, input }) => {
      // Enforce one-household-per-owner limit
      const owned = await db
        .select({ cnt: count() })
        .from(members)
        .where(and(eq(members.userId, ctx.userId), eq(members.role, "owner")));
      if ((owned[0]?.cnt ?? 0) > 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You have already created a household. You can join other households using a join code.",
        });
      }

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

      await cache.del(cacheKey.myHouseholds(ctx.userId));
      return household;
    }),

  update: householdProcedure
    .input(updateHouseholdSchema)
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.membership);

      const { theme, ...rest } = input;

      const updateData: Record<string, unknown> = { ...rest, updatedAt: new Date() };
      if (theme) {
        const [existing] = await db
          .select()
          .from(households)
          .where(eq(households.id, ctx.householdId));
        if (existing) {
          updateData.theme = { ...existing.theme, ...theme };
        }
      }

      const [household] = await db
        .update(households)
        .set(updateData)
        .where(eq(households.id, ctx.householdId))
        .returning();

      await logActivity({
        householdId: ctx.householdId,
        action: "household.updated",
        subjectType: "household",
        subjectId: household.id,
        subjectName: household.name,
        performedBy: ctx.membership.id,
        metadata: { changedFields: Object.keys(input) },
      });

      await invalidateHousehold(ctx.householdId);
      return household;
    }),

  delete: householdProcedure.mutation(async ({ ctx }) => {
    requireOwner(ctx.membership);

    await db.delete(households).where(eq(households.id, ctx.householdId));
    await invalidateHousehold(ctx.householdId);
    return { success: true };
  }),

  regenerateJoinCode: householdProcedure.mutation(async ({ ctx }) => {
    requireOwner(ctx.membership);

    const [household] = await db
      .update(households)
      .set({ joinCode: generateJoinCode(), updatedAt: new Date() })
      .where(eq(households.id, ctx.householdId))
      .returning();

    await logActivity({
      householdId: ctx.householdId,
      action: "household.join_code_regenerated",
      subjectType: "household",
      subjectId: household.id,
      subjectName: household.name,
      performedBy: ctx.membership.id,
    });

    return household;
  }),
});
