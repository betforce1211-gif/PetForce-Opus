import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, members } from "@petforce/db";
import superjson from "superjson";
import { telemetryMiddleware } from "./lib/trpc-telemetry.js";
import { idempotencyMiddleware } from "./lib/idempotency.js";
import { cache, cacheKey, CACHE_TTL } from "./lib/cache.js";

export interface Context {
  userId: string | null;
  /** Set by Hono middleware when X-Idempotency-Key header is present */
  _idempotencyKey?: string;
}

/** The membership record shape returned by householdProcedure context */
export type MembershipRecord = typeof members.$inferSelect;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;

// Base procedure with telemetry + idempotency — all procedures inherit these.
// @ts-expect-error — telemetryMiddleware uses a loose opts type for portability
const instrumentedProcedure = t.procedure.use(telemetryMiddleware).use(idempotencyMiddleware);

export const publicProcedure = instrumentedProcedure;
export const protectedProcedure = instrumentedProcedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

export const householdProcedure = protectedProcedure
  .input(z.object({ householdId: z.uuid() }))
  .use(async ({ ctx, input, next }) => {
    const key = cacheKey.membership(input.householdId, ctx.userId);

    // Try cache first — membership checks run on every household request
    let membership = await cache.get<MembershipRecord>(key);

    if (!membership) {
      const [row] = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.householdId, input.householdId),
            eq(members.userId, ctx.userId)
          )
        );
      membership = row ?? null;

      if (membership) {
        await cache.set(key, membership, CACHE_TTL.membership);
      }
    }

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

// ── Role-check helpers ──────────────────────────────────────────────
// Use these inside householdProcedure handlers where ctx.membership is available.

/** Throw FORBIDDEN unless the caller is an owner or admin. */
export function requireAdmin(membership: MembershipRecord): void {
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only owners and admins can perform this action",
    });
  }
}

/** Throw FORBIDDEN unless the caller is an owner. */
export function requireOwner(membership: MembershipRecord): void {
  if (membership.role !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only owners can perform this action",
    });
  }
}

// ── Entity-level membership verification ────────────────────────────
// For procedures that look up an entity by ID (not by householdId), we need to
// verify membership against the entity's household. This avoids duplicating the
// members query across every router.

/**
 * Verify a user's membership in a given household. Returns the membership record.
 * Throws FORBIDDEN if not a member.
 */
export async function verifyMembership(
  householdId: string,
  userId: string
): Promise<MembershipRecord> {
  const [membership] = await db
    .select()
    .from(members)
    .where(
      and(eq(members.householdId, householdId), eq(members.userId, userId))
    );

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this household",
    });
  }

  return membership;
}
