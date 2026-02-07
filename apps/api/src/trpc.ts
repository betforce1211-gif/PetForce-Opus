import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, members } from "@petforce/db";
import superjson from "superjson";

export interface Context {
  userId: string | null;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

export const householdProcedure = protectedProcedure
  .input(z.object({ householdId: z.string().uuid() }))
  .use(async ({ ctx, input, next }) => {
    const [membership] = await db
      .select()
      .from(members)
      .where(
        and(
          eq(members.householdId, input.householdId),
          eq(members.userId, ctx.userId)
        )
      );

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not a member of this household",
      });
    }

    return next({
      ctx: {
        ...ctx,
        householdId: input.householdId,
        membership,
      },
    });
  });
