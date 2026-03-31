/**
 * Notification trigger logic — scans the database for events that should
 * generate notifications and enqueues them to the BullMQ notifications queue.
 *
 * Called by a repeatable BullMQ job (see scheduler setup in worker.ts).
 */

import { eq, and, gt, lte } from "drizzle-orm";
import {
  db,
  medications,
  medicationLogs,
  healthRecords,
  feedingSchedules,
  feedingLogs,
  members,
  pets,
  households,
} from "@petforce/db";
import { enqueueNotification } from "./queue.js";
import { logger } from "./logger.js";

// ---------------------------------------------------------------------------
// Overdue medication reminders
// ---------------------------------------------------------------------------

export async function checkOverdueMedications(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  const activeMeds = await db
    .select({
      medication: medications,
      pet: { name: pets.name },
      household: { name: households.name },
    })
    .from(medications)
    .innerJoin(pets, eq(medications.petId, pets.id))
    .innerJoin(households, eq(medications.householdId, households.id))
    .where(and(eq(medications.isActive, true)));

  let enqueued = 0;

  for (const row of activeMeds) {
    const med = row.medication;

    // Check if already logged today
    const [existingLog] = await db
      .select()
      .from(medicationLogs)
      .where(
        and(
          eq(medicationLogs.medicationId, med.id),
          eq(medicationLogs.loggedDate, today),
        ),
      );

    if (existingLog) continue;

    // Get all members in this household to notify
    const householdMembers = await db
      .select()
      .from(members)
      .where(eq(members.householdId, med.householdId));

    for (const member of householdMembers) {
      // Enqueue email if member has email
      if (member.email) {
        await enqueueNotification({
          type: "email",
          recipientUserId: member.userId,
          householdId: med.householdId,
          template: "medication-reminder",
          data: {
            recipientEmail: member.email,
            petName: row.pet.name,
            householdName: row.household.name,
            memberName: member.displayName,
            medicationName: med.name,
            dosage: med.dosage ?? undefined,
          },
        });
        enqueued++;
      }

      // Enqueue push if member has push token
      if (member.expoPushToken) {
        await enqueueNotification({
          type: "push",
          recipientUserId: member.userId,
          householdId: med.householdId,
          template: "medication-reminder",
          data: {
            expoPushToken: member.expoPushToken,
            petName: row.pet.name,
            medicationName: med.name,
          },
        });
        enqueued++;
      }
    }
  }

  logger.info({ enqueued, type: "medication-reminder" }, "Medication reminder check complete");
  return enqueued;
}

// ---------------------------------------------------------------------------
// Upcoming vet visit alerts (within next 24 hours)
// ---------------------------------------------------------------------------

export async function checkUpcomingVetVisits(): Promise<number> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcomingVisits = await db
    .select({
      record: healthRecords,
      pet: { name: pets.name },
      household: { name: households.name },
    })
    .from(healthRecords)
    .innerJoin(pets, eq(healthRecords.petId, pets.id))
    .innerJoin(households, eq(healthRecords.householdId, households.id))
    .where(
      and(
        gt(healthRecords.date, now),
        lte(healthRecords.date, tomorrow),
        eq(healthRecords.type, "vet_visit"),
      ),
    );

  let enqueued = 0;

  for (const row of upcomingVisits) {
    const record = row.record;
    const visitDate = record.date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const householdMembers = await db
      .select()
      .from(members)
      .where(eq(members.householdId, record.householdId));

    for (const member of householdMembers) {
      if (member.email) {
        await enqueueNotification({
          type: "email",
          recipientUserId: member.userId,
          householdId: record.householdId,
          template: "vet-visit-alert",
          data: {
            recipientEmail: member.email,
            petName: row.pet.name,
            householdName: row.household.name,
            memberName: member.displayName,
            visitDate,
            vetOrClinic: record.vetOrClinic ?? undefined,
            reason: record.reason ?? undefined,
          },
        });
        enqueued++;
      }

      if (member.expoPushToken) {
        await enqueueNotification({
          type: "push",
          recipientUserId: member.userId,
          householdId: record.householdId,
          template: "vet-visit-alert",
          data: {
            expoPushToken: member.expoPushToken,
            petName: row.pet.name,
            visitDate,
          },
        });
        enqueued++;
      }
    }
  }

  logger.info({ enqueued, type: "vet-visit-alert" }, "Vet visit alert check complete");
  return enqueued;
}

// ---------------------------------------------------------------------------
// Feeding reminders (active schedules not yet logged today)
// ---------------------------------------------------------------------------

export async function checkFeedingReminders(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const activeSchedules = await db
    .select({
      schedule: feedingSchedules,
      pet: { name: pets.name },
      household: { name: households.name },
    })
    .from(feedingSchedules)
    .innerJoin(pets, eq(feedingSchedules.petId, pets.id))
    .innerJoin(households, eq(feedingSchedules.householdId, households.id))
    .where(eq(feedingSchedules.isActive, true));

  let enqueued = 0;

  for (const row of activeSchedules) {
    const schedule = row.schedule;

    // Parse "HH:mm" time and check if it's within the past 15 minutes
    const [hours, minutes] = schedule.time.split(":").map(Number);
    const scheduleMinutes = hours * 60 + minutes;
    const diff = nowMinutes - scheduleMinutes;
    if (diff < 0 || diff > 15) continue;

    // Check if already logged today
    const [existingLog] = await db
      .select()
      .from(feedingLogs)
      .where(
        and(
          eq(feedingLogs.feedingScheduleId, schedule.id),
          eq(feedingLogs.feedingDate, today),
        ),
      );

    if (existingLog) continue;

    const householdMembers = await db
      .select()
      .from(members)
      .where(eq(members.householdId, schedule.householdId));

    for (const member of householdMembers) {
      if (member.email) {
        await enqueueNotification({
          type: "email",
          recipientUserId: member.userId,
          householdId: schedule.householdId,
          template: "feeding-reminder",
          data: {
            recipientEmail: member.email,
            petName: row.pet.name,
            householdName: row.household.name,
            memberName: member.displayName,
            feedingLabel: schedule.label,
            feedingTime: schedule.time,
            foodType: schedule.foodType ?? undefined,
          },
        });
        enqueued++;
      }

      if (member.expoPushToken) {
        await enqueueNotification({
          type: "push",
          recipientUserId: member.userId,
          householdId: schedule.householdId,
          template: "feeding-reminder",
          data: {
            expoPushToken: member.expoPushToken,
            petName: row.pet.name,
            feedingLabel: schedule.label,
          },
        });
        enqueued++;
      }
    }
  }

  logger.info({ enqueued, type: "feeding-reminder" }, "Feeding reminder check complete");
  return enqueued;
}

// ---------------------------------------------------------------------------
// Run all trigger checks — called by the scheduler
// ---------------------------------------------------------------------------

export async function runAllNotificationTriggers(): Promise<void> {
  logger.info("Running notification trigger scan...");

  const results = await Promise.allSettled([
    checkOverdueMedications(),
    checkUpcomingVetVisits(),
    checkFeedingReminders(),
  ]);

  for (const [i, result] of results.entries()) {
    const names = ["medication-reminders", "vet-visit-alerts", "feeding-reminders"];
    if (result.status === "rejected") {
      logger.error({ trigger: names[i], err: result.reason }, "Notification trigger failed");
    }
  }

  logger.info("Notification trigger scan complete");
}
