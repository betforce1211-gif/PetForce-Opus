import { eq, desc } from "drizzle-orm";
import { protectedProcedure, householdProcedure, router } from "../trpc";
import { db, households, members, pets, activities } from "@petforce/db";
import { onboardHouseholdSchema } from "@petforce/core";
import type { HouseholdSummary } from "@petforce/core";

export const dashboardRouter = router({
  myHouseholds: protectedProcedure.query(async ({ ctx }) => {
    const userMemberships = await db
      .select()
      .from(members)
      .where(eq(members.userId, ctx.userId));

    if (userMemberships.length === 0) return [];

    const summaries: HouseholdSummary[] = [];

    for (const membership of userMemberships) {
      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.id, membership.householdId));

      if (!household) continue;

      const householdMembers = await db
        .select()
        .from(members)
        .where(eq(members.householdId, household.id));

      const householdPets = await db
        .select()
        .from(pets)
        .where(eq(pets.householdId, household.id));

      summaries.push({
        id: household.id,
        name: household.name,
        theme: household.theme,
        petCount: householdPets.length,
        memberCount: householdMembers.length,
      });
    }

    return summaries;
  }),

  get: householdProcedure.query(async ({ ctx }) => {
    const [household] = await db
      .select()
      .from(households)
      .where(eq(households.id, ctx.householdId));

    const householdMembers = await db
      .select()
      .from(members)
      .where(eq(members.householdId, ctx.householdId));

    const householdPets = await db
      .select()
      .from(pets)
      .where(eq(pets.householdId, ctx.householdId));

    const recentActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.householdId, ctx.householdId))
      .orderBy(desc(activities.createdAt))
      .limit(20);

    return {
      household,
      members: householdMembers,
      pets: householdPets,
      recentActivities,
    };
  }),

  onboard: protectedProcedure
    .input(onboardHouseholdSchema)
    .mutation(async ({ ctx, input }) => {
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

      await db.insert(members).values({
        householdId: household.id,
        userId: ctx.userId,
        role: "owner",
        displayName: input.displayName,
      });

      return household;
    }),
});
