import { eq, desc, and, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, householdProcedure, router } from "../trpc";
import { db, households, members, pets, activities, invitations, accessRequests } from "@petforce/db";
import { onboardHouseholdSchema } from "@petforce/core";
import type { HouseholdSummary } from "@petforce/core";
import { generateJoinCode } from "../utils/join-code";

/** Check if a user already owns (created) a household */
async function hasCreatedHousehold(userId: string): Promise<boolean> {
  const ownerRows = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.userId, userId), eq(members.role, "owner")));
  return ownerRows.length > 0;
}

export const dashboardRouter = router({
  myHouseholds: protectedProcedure.query(async ({ ctx }) => {
    const userMemberships = await db
      .select()
      .from(members)
      .where(eq(members.userId, ctx.userId));

    if (userMemberships.length === 0) return [];

    const householdIds = userMemberships.map((m) => m.householdId);

    // Batch: fetch all households, members, and pets in 3 queries instead of 3N
    const [allHouseholds, allMembers, allPets] = await Promise.all([
      db.select().from(households).where(inArray(households.id, householdIds)),
      db.select().from(members).where(inArray(members.householdId, householdIds)),
      db.select().from(pets).where(inArray(pets.householdId, householdIds)),
    ]);

    const householdMap = new Map(allHouseholds.map((h) => [h.id, h]));
    const memberCounts = new Map<string, number>();
    const petCounts = new Map<string, number>();

    for (const m of allMembers) {
      memberCounts.set(m.householdId, (memberCounts.get(m.householdId) ?? 0) + 1);
    }
    for (const p of allPets) {
      petCounts.set(p.householdId, (petCounts.get(p.householdId) ?? 0) + 1);
    }

    const summaries: HouseholdSummary[] = [];
    for (const membership of userMemberships) {
      const household = householdMap.get(membership.householdId);
      if (!household) continue;

      summaries.push({
        id: household.id,
        name: household.name,
        theme: household.theme,
        petCount: petCounts.get(household.id) ?? 0,
        memberCount: memberCounts.get(household.id) ?? 0,
        role: membership.role,
      });
    }

    return summaries;
  }),

  get: householdProcedure.query(async ({ ctx }) => {
    // Parallelize all independent queries
    const [
      [household],
      householdMembers,
      householdPets,
      recentActivities,
      pendingInvites,
      pendingRequests,
    ] = await Promise.all([
      db.select().from(households).where(eq(households.id, ctx.householdId)),
      db.select().from(members).where(eq(members.householdId, ctx.householdId)),
      db.select().from(pets).where(eq(pets.householdId, ctx.householdId)),
      db
        .select()
        .from(activities)
        .where(eq(activities.householdId, ctx.householdId))
        .orderBy(desc(activities.createdAt))
        .limit(20),
      db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.householdId, ctx.householdId),
            eq(invitations.status, "pending")
          )
        ),
      db
        .select()
        .from(accessRequests)
        .where(
          and(
            eq(accessRequests.householdId, ctx.householdId),
            eq(accessRequests.status, "pending")
          )
        ),
    ]);

    // Only expose pending counts to owners/admins
    const callerMember = householdMembers.find((m) => m.userId === ctx.userId);
    const isAdmin =
      callerMember && (callerMember.role === "owner" || callerMember.role === "admin");

    return {
      household,
      members: householdMembers,
      pets: householdPets,
      recentActivities,
      pendingInviteCount: isAdmin ? pendingInvites.length : 0,
      pendingRequestCount: isAdmin ? pendingRequests.length : 0,
    };
  }),

  canCreateHousehold: protectedProcedure.query(async ({ ctx }) => {
    const alreadyOwner = await hasCreatedHousehold(ctx.userId);
    return { canCreate: !alreadyOwner };
  }),

  onboard: protectedProcedure
    .input(onboardHouseholdSchema)
    .mutation(async ({ ctx, input }) => {
      if (await hasCreatedHousehold(ctx.userId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You have already created a household. You can join other households using a join code.",
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
        displayName: input.displayName,
      });

      return household;
    }),
});
