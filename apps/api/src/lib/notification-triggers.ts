/**
 * Notification trigger logic — scans the database for events that should
 * generate notifications and enqueues them to the BullMQ notifications queue.
 *
 * All triggers respect per-member notification preferences.
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
  notificationPreferences,
  pets,
  households,
} from "@petforce/db";
import type { NotificationPreferences } from "@petforce/core";
import { enqueueNotification } from "./queue.js";
import { logger } from "./logger.js";

// ---------------------------------------------------------------------------
// Preference-aware helpers
// ---------------------------------------------------------------------------

const PREF_DEFAULTS: NotificationPreferences = {
  streakAlerts: true,
  budgetAlerts: true,
  weeklyDigest: true,
  achievementAlerts: true,
};

async function getMemberPreferences(
  memberId: string,
  householdId: string,
): Promise<NotificationPreferences> {
  const [record] = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.memberId, memberId),
        eq(notificationPreferences.householdId, householdId),
      ),
    );
  return (record?.preferences as NotificationPreferences) ?? PREF_DEFAULTS;
}

// Map notification templates to the preference key that gates them.
// Templates not in this map are always sent (e.g. medication/feeding/vet —
// these are critical care reminders that should not be silenced).
const TEMPLATE_TO_PREF: Partial<Record<string, keyof NotificationPreferences>> = {
  "streak-alert": "streakAlerts",
  "budget-alert": "budgetAlerts",
  "weekly-digest": "weeklyDigest",
  "achievement-alert": "achievementAlerts",
};

interface MemberRow {
  id: string;
  userId: string;
  householdId: string;
  email: string | null;
  expoPushToken: string | null;
  displayName: string;
}

async function enqueueForMember(
  member: MemberRow,
  template: string,
  emailData: Record<string, unknown>,
  pushData: Record<string, unknown>,
): Promise<number> {
  // Check if this template is gated by a notification preference
  const prefKey = TEMPLATE_TO_PREF[template];
  if (prefKey) {
    const prefs = await getMemberPreferences(member.id, member.householdId);
    if (!prefs[prefKey]) {
      logger.debug(
        { memberId: member.id, template, prefKey },
        "Notification suppressed by member preference",
      );
      return 0;
    }
  }

  let count = 0;

  if (member.email) {
    await enqueueNotification({
      type: "email",
      recipientUserId: member.userId,
      householdId: member.householdId,
      template,
      data: { ...emailData, recipientEmail: member.email, memberName: member.displayName },
    });
    count++;
  }

  if (member.expoPushToken) {
    await enqueueNotification({
      type: "push",
      recipientUserId: member.userId,
      householdId: member.householdId,
      template,
      data: { ...pushData, expoPushToken: member.expoPushToken },
    });
    count++;
  }

  return count;
}

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

    const householdMembers = await db
      .select()
      .from(members)
      .where(eq(members.householdId, med.householdId));

    for (const member of householdMembers) {
      enqueued += await enqueueForMember(
        member,
        "medication-reminder",
        {
          petName: row.pet.name,
          householdName: row.household.name,
          medicationName: med.name,
          dosage: med.dosage ?? undefined,
        },
        {
          petName: row.pet.name,
          medicationName: med.name,
        },
      );
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
      enqueued += await enqueueForMember(
        member,
        "vet-visit-alert",
        {
          petName: row.pet.name,
          householdName: row.household.name,
          visitDate,
          vetOrClinic: record.vetOrClinic ?? undefined,
          reason: record.reason ?? undefined,
        },
        {
          petName: row.pet.name,
          visitDate,
        },
      );
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
      enqueued += await enqueueForMember(
        member,
        "feeding-reminder",
        {
          petName: row.pet.name,
          householdName: row.household.name,
          feedingLabel: schedule.label,
          feedingTime: schedule.time,
          foodType: schedule.foodType ?? undefined,
        },
        {
          petName: row.pet.name,
          feedingLabel: schedule.label,
        },
      );
    }
  }

  logger.info({ enqueued, type: "feeding-reminder" }, "Feeding reminder check complete");
  return enqueued;
}

// ---------------------------------------------------------------------------
// Household activity notifications — called inline from mutation handlers
// ---------------------------------------------------------------------------

export async function notifyHouseholdActivity(
  householdId: string,
  template: "pet-added" | "member-joined",
  data: Record<string, unknown>,
): Promise<number> {
  const householdMembers = await db
    .select()
    .from(members)
    .where(eq(members.householdId, householdId));

  let enqueued = 0;

  for (const member of householdMembers) {
    enqueued += await enqueueForMember(member, template, data, data);
  }

  logger.info({ enqueued, template, householdId }, "Household activity notification sent");
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
