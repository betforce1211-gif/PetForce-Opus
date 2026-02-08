import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { householdProcedure, protectedProcedure, router } from "../trpc";
import { db, accessRequests, members, households } from "@petforce/db";
import { createAccessRequestSchema } from "@petforce/core";

export const accessRequestRouter = router({
  create: protectedProcedure
    .input(createAccessRequestSchema)
    .mutation(async ({ ctx, input }) => {
      // Look up household by join code
      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.joinCode, input.joinCode));

      if (!household) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No household found with that join code",
        });
      }

      // Check if already a member
      const [existing] = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.householdId, household.id),
            eq(members.userId, ctx.userId)
          )
        );

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a member of this household",
        });
      }

      // Check if there's already a pending request
      const [pendingRequest] = await db
        .select()
        .from(accessRequests)
        .where(
          and(
            eq(accessRequests.householdId, household.id),
            eq(accessRequests.userId, ctx.userId),
            eq(accessRequests.status, "pending")
          )
        );

      if (pendingRequest) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have a pending request for this household",
        });
      }

      const [request] = await db
        .insert(accessRequests)
        .values({
          householdId: household.id,
          userId: ctx.userId,
          displayName: input.displayName,
          message: input.message ?? null,
        })
        .returning();

      return request;
    }),

  listByHousehold: householdProcedure.query(async ({ ctx }) => {
    if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only owners and admins can view access requests",
      });
    }

    return db
      .select()
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.householdId, ctx.householdId),
          eq(accessRequests.status, "pending")
        )
      );
  }),

  approve: householdProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can approve requests",
        });
      }

      const [request] = await db
        .select()
        .from(accessRequests)
        .where(
          and(
            eq(accessRequests.id, input.requestId),
            eq(accessRequests.householdId, ctx.householdId),
            eq(accessRequests.status, "pending")
          )
        );

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pending access request not found",
        });
      }

      // Create member with default "member" role
      const [member] = await db
        .insert(members)
        .values({
          householdId: ctx.householdId,
          userId: request.userId,
          role: "member",
          displayName: request.displayName,
        })
        .returning();

      // Mark request as approved
      await db
        .update(accessRequests)
        .set({ status: "approved", reviewedBy: ctx.membership.id })
        .where(eq(accessRequests.id, input.requestId));

      return member;
    }),

  deny: householdProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can deny requests",
        });
      }

      const [request] = await db
        .update(accessRequests)
        .set({ status: "denied", reviewedBy: ctx.membership.id })
        .where(
          and(
            eq(accessRequests.id, input.requestId),
            eq(accessRequests.householdId, ctx.householdId),
            eq(accessRequests.status, "pending")
          )
        )
        .returning();

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pending access request not found",
        });
      }

      return { success: true };
    }),
});
