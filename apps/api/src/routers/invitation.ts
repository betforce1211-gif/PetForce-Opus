import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { householdProcedure, protectedProcedure, router } from "../trpc";
import { db, invitations, members, households } from "@petforce/db";
import { createInvitationSchema } from "@petforce/core";
import { generateInviteToken } from "../utils/join-code";

export const invitationRouter = router({
  create: householdProcedure
    .input(createInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can create invitations",
        });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const [invitation] = await db
        .insert(invitations)
        .values({
          householdId: ctx.householdId,
          invitedBy: ctx.membership.id,
          email: input.email ?? null,
          token: generateInviteToken(),
          role: input.role,
          expiresAt,
        })
        .returning();

      return invitation;
    }),

  listByHousehold: householdProcedure.query(async ({ ctx }) => {
    if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only owners and admins can view invitations",
      });
    }

    return db
      .select()
      .from(invitations)
      .where(eq(invitations.householdId, ctx.householdId));
  }),

  revoke: householdProcedure
    .input(z.object({ invitationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can revoke invitations",
        });
      }

      const [invitation] = await db
        .update(invitations)
        .set({ status: "expired" })
        .where(
          and(
            eq(invitations.id, input.invitationId),
            eq(invitations.householdId, ctx.householdId),
            eq(invitations.status, "pending")
          )
        )
        .returning();

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pending invitation not found",
        });
      }

      return invitation;
    }),

  getByToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.token, input.token));

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.id, invitation.householdId));

      return {
        ...invitation,
        householdName: household?.name ?? "Unknown",
      };
    }),

  accept: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.token, input.token));

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      if (invitation.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invitation has already been ${invitation.status}`,
        });
      }

      if (new Date() > invitation.expiresAt) {
        await db
          .update(invitations)
          .set({ status: "expired" })
          .where(eq(invitations.id, invitation.id));
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has expired",
        });
      }

      // Check if already a member
      const [existing] = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.householdId, invitation.householdId),
            eq(members.userId, ctx.userId)
          )
        );

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a member of this household",
        });
      }

      // Create member and mark invitation accepted
      const [member] = await db
        .insert(members)
        .values({
          householdId: invitation.householdId,
          userId: ctx.userId,
          role: invitation.role,
          displayName: ctx.userId, // Will be updated by user
        })
        .returning();

      await db
        .update(invitations)
        .set({ status: "accepted" })
        .where(eq(invitations.id, invitation.id));

      return member;
    }),

  decline: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const [invitation] = await db
        .update(invitations)
        .set({ status: "declined" })
        .where(
          and(
            eq(invitations.token, input.token),
            eq(invitations.status, "pending")
          )
        )
        .returning();

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pending invitation not found",
        });
      }

      return { success: true };
    }),
});
