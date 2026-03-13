import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { householdProcedure, router, requireAdmin } from "../trpc.js";
import { db, members } from "@petforce/db";
import { paginationInput } from "@petforce/core";
import { logActivity } from "../lib/audit.js";

export const memberRouter = router({
  listByHousehold: householdProcedure
    .input(paginationInput)
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(members)
        .where(eq(members.householdId, ctx.householdId))
        .orderBy(desc(members.joinedAt))
        .limit(input.limit)
        .offset(input.offset);
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
      requireAdmin(ctx.membership);

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

      await logActivity({
        householdId: ctx.householdId,
        action: "member.invited",
        subjectType: "member",
        subjectId: member.id,
        subjectName: input.displayName,
        performedBy: ctx.membership.id,
        metadata: { role: input.role, targetUserId: input.userId },
      });

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
      requireAdmin(ctx.membership);

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

      await logActivity({
        householdId: ctx.householdId,
        action: "member.role_changed",
        subjectType: "member",
        subjectId: member.id,
        subjectName: member.displayName,
        performedBy: ctx.membership.id,
        metadata: { newRole: input.role },
      });

      return member;
    }),

  remove: householdProcedure
    .input(z.object({ memberId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.membership);

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

      await logActivity({
        householdId: ctx.householdId,
        action: "member.removed",
        subjectType: "member",
        subjectId: target.id,
        subjectName: target.displayName,
        performedBy: ctx.membership.id,
      });

      return { success: true };
    }),

  leave: householdProcedure.mutation(async ({ ctx }) => {
    // Prevent the last owner from leaving
    if (ctx.membership.role === "owner") {
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
          message:
            "You are the last owner. Transfer ownership to another member before leaving.",
        });
      }
    }

    await db
      .delete(members)
      .where(
        and(
          eq(members.id, ctx.membership.id),
          eq(members.householdId, ctx.householdId)
        )
      );

    await logActivity({
      householdId: ctx.householdId,
      action: "member.left",
      subjectType: "member",
      subjectId: ctx.membership.id,
      subjectName: ctx.membership.displayName,
      performedBy: ctx.membership.id,
    });

    return { success: true };
  }),
});
