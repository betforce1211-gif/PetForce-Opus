import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { householdProcedure, router } from "../trpc";
import { db, members } from "@petforce/db";

export const memberRouter = router({
  listByHousehold: householdProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(members)
      .where(eq(members.householdId, ctx.householdId));
  }),

  invite: householdProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        role: z.enum(["admin", "member", "sitter"]),
        displayName: z.string().min(1).max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can invite members",
        });
      }

      const [existing] = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.householdId, ctx.householdId),
            eq(members.userId, input.userId)
          )
        );

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a member of this household",
        });
      }

      const [member] = await db
        .insert(members)
        .values({
          householdId: ctx.householdId,
          userId: input.userId,
          role: input.role,
          displayName: input.displayName,
        })
        .returning();
      return member;
    }),

  updateRole: householdProcedure
    .input(
      z.object({
        memberId: z.string().uuid(),
        role: z.enum(["owner", "admin", "member", "sitter"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can update roles",
        });
      }

      const [member] = await db
        .update(members)
        .set({ role: input.role })
        .where(
          and(
            eq(members.id, input.memberId),
            eq(members.householdId, ctx.householdId)
          )
        )
        .returning();
      return member;
    }),

  remove: householdProcedure
    .input(z.object({ memberId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can remove members",
        });
      }

      // Prevent removing the last owner
      const [target] = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.id, input.memberId),
            eq(members.householdId, ctx.householdId)
          )
        );

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      if (target.role === "owner") {
        const owners = await db
          .select()
          .from(members)
          .where(
            and(
              eq(members.householdId, ctx.householdId),
              eq(members.role, "owner")
            )
          );
        if (owners.length <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot remove the last owner",
          });
        }
      }

      await db
        .delete(members)
        .where(
          and(
            eq(members.id, input.memberId),
            eq(members.householdId, ctx.householdId)
          )
        );
      return { success: true };
    }),
});
