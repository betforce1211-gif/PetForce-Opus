import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { householdProcedure, router } from "../trpc";
import {
  db,
  feedingSchedules,
  feedingLogs,
  feedingSnoozes,
  pets,
} from "@petforce/db";
import {
  createFeedingScheduleSchema,
  updateFeedingScheduleSchema,
  logFeedingSchema,
  snoozeFeedingSchema,
} from "@petforce/core";
import type {
  HouseholdFeedingStatus,
  PetFeedingStatus,
  FeedingScheduleStatus,
} from "@petforce/core";

export const feedingRouter = router({
  listSchedules: householdProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(feedingSchedules)
      .where(
        and(
          eq(feedingSchedules.householdId, ctx.householdId),
          eq(feedingSchedules.isActive, true)
        )
      );
  }),

  createSchedule: householdProcedure
    .input(createFeedingScheduleSchema)
    .mutation(async ({ ctx, input }) => {
      const [schedule] = await db
        .insert(feedingSchedules)
        .values({
          householdId: ctx.householdId,
          petId: input.petId,
          label: input.label,
          time: input.time,
          foodType: input.foodType ?? null,
          amount: input.amount ?? null,
          notes: input.notes ?? null,
        })
        .returning();
      return schedule;
    }),

  updateSchedule: householdProcedure
    .input(updateFeedingScheduleSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [schedule] = await db
        .update(feedingSchedules)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(feedingSchedules.id, id),
            eq(feedingSchedules.householdId, ctx.householdId)
          )
        )
        .returning();
      return schedule;
    }),

  deleteSchedule: householdProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(feedingSchedules)
        .where(
          and(
            eq(feedingSchedules.id, input.id),
            eq(feedingSchedules.householdId, ctx.householdId)
          )
        );
      return { success: true };
    }),

  todayStatus: householdProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }))
    .query(async ({ ctx, input }) => {
      const today =
        input.date ?? new Date().toISOString().split("T")[0];

      // Fetch active schedules for household
      const schedules = await db
        .select()
        .from(feedingSchedules)
        .where(
          and(
            eq(feedingSchedules.householdId, ctx.householdId),
            eq(feedingSchedules.isActive, true)
          )
        );

      // Fetch today's logs for household
      const logs = await db
        .select()
        .from(feedingLogs)
        .where(
          and(
            eq(feedingLogs.householdId, ctx.householdId),
            eq(feedingLogs.feedingDate, today)
          )
        );

      // Fetch today's snoozes for the current member only
      const snoozes = await db
        .select()
        .from(feedingSnoozes)
        .where(
          and(
            eq(feedingSnoozes.householdId, ctx.householdId),
            eq(feedingSnoozes.snoozeDate, today),
            eq(feedingSnoozes.snoozedBy, ctx.membership.id)
          )
        );

      // Fetch pets for name lookup
      const householdPets = await db
        .select()
        .from(pets)
        .where(eq(pets.householdId, ctx.householdId));

      const petMap = new Map(householdPets.map((p) => [p.id, p.name]));
      const logBySchedule = new Map(logs.map((l) => [l.feedingScheduleId, l]));
      const snoozeBySchedule = new Map(snoozes.map((s) => [s.feedingScheduleId, s]));

      // Group by pet
      const petSchedules = new Map<string, FeedingScheduleStatus[]>();
      for (const schedule of schedules) {
        const statuses = petSchedules.get(schedule.petId) ?? [];
        statuses.push({
          schedule,
          log: logBySchedule.get(schedule.id) ?? null,
          snooze: snoozeBySchedule.get(schedule.id) ?? null,
        });
        petSchedules.set(schedule.petId, statuses);
      }

      // Sort each pet's schedules by time
      const petFeedingStatuses: PetFeedingStatus[] = [];
      for (const [petId, statuses] of petSchedules) {
        statuses.sort((a, b) => a.schedule.time.localeCompare(b.schedule.time));
        petFeedingStatuses.push({
          petId,
          petName: petMap.get(petId) ?? "Unknown",
          schedules: statuses,
        });
      }

      // Sort pets alphabetically
      petFeedingStatuses.sort((a, b) => a.petName.localeCompare(b.petName));

      const totalScheduled = schedules.length;
      const totalCompleted = logs.length;

      const result: HouseholdFeedingStatus = {
        date: today,
        pets: petFeedingStatuses,
        totalScheduled,
        totalCompleted,
      };

      return result;
    }),

  snooze: householdProcedure
    .input(snoozeFeedingSchema)
    .mutation(async ({ ctx, input }) => {
      const snoozedUntil = new Date(
        Date.now() + input.snoozeDurationMinutes * 60 * 1000
      );

      // Delete existing snooze for same member+schedule+date, then insert new one
      await db
        .delete(feedingSnoozes)
        .where(
          and(
            eq(feedingSnoozes.feedingScheduleId, input.feedingScheduleId),
            eq(feedingSnoozes.householdId, ctx.householdId),
            eq(feedingSnoozes.snoozeDate, input.feedingDate),
            eq(feedingSnoozes.snoozedBy, ctx.membership.id)
          )
        );

      const [snooze] = await db
        .insert(feedingSnoozes)
        .values({
          feedingScheduleId: input.feedingScheduleId,
          householdId: ctx.householdId,
          snoozeDate: input.feedingDate,
          snoozedUntil,
          snoozedBy: ctx.membership.id,
        })
        .returning();

      return snooze;
    }),

  undoSnooze: householdProcedure
    .input(z.object({
      feedingScheduleId: z.string().uuid(),
      feedingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(feedingSnoozes)
        .where(
          and(
            eq(feedingSnoozes.feedingScheduleId, input.feedingScheduleId),
            eq(feedingSnoozes.householdId, ctx.householdId),
            eq(feedingSnoozes.snoozeDate, input.feedingDate),
            eq(feedingSnoozes.snoozedBy, ctx.membership.id)
          )
        );
      return { success: true };
    }),

  logCompletion: householdProcedure
    .input(logFeedingSchema)
    .mutation(async ({ ctx, input }) => {
      // Look up the schedule to get petId
      const [schedule] = await db
        .select()
        .from(feedingSchedules)
        .where(
          and(
            eq(feedingSchedules.id, input.feedingScheduleId),
            eq(feedingSchedules.householdId, ctx.householdId)
          )
        );

      if (!schedule) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feeding schedule not found" });
      }

      const [log] = await db
        .insert(feedingLogs)
        .values({
          feedingScheduleId: input.feedingScheduleId,
          householdId: ctx.householdId,
          petId: schedule.petId,
          completedBy: ctx.membership.id,
          feedingDate: input.feedingDate,
          notes: input.notes ?? null,
          skipped: input.skipped ?? false,
        })
        .returning();

      return log;
    }),

  undoCompletion: householdProcedure
    .input(z.object({ feedingLogId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(feedingLogs)
        .where(
          and(
            eq(feedingLogs.id, input.feedingLogId),
            eq(feedingLogs.householdId, ctx.householdId)
          )
        );
      return { success: true };
    }),
});
