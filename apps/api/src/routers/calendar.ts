import { and, eq, gte, lte, isNull, asc } from "drizzle-orm";
import { householdProcedure, router } from "../trpc";
import {
  db,
  activities,
  feedingSchedules,
  feedingLogs,
  healthRecords,
  pets,
  members,
} from "@petforce/db";
import {
  calendarMonthInputSchema,
  calendarUpcomingInputSchema,
  PET_HOLIDAYS,
} from "@petforce/core";
import type { CalendarEvent, CalendarMonthData, UpcomingCalendarEvents } from "@petforce/core";

export const calendarRouter = router({
  monthEvents: householdProcedure
    .input(calendarMonthInputSchema)
    .query(async ({ ctx, input }) => {
      const { householdId } = ctx;
      const { month } = input;

      // Calculate month range
      const [year, mon] = month.split("-").map(Number);
      const monthStart = new Date(year, mon - 1, 1);
      const monthEnd = new Date(year, mon, 0, 23, 59, 59, 999); // last day of month

      // Fetch activities for this month (by scheduledAt or completedAt)
      const monthActivities = await db
        .select()
        .from(activities)
        .where(
          and(
            eq(activities.householdId, householdId),
            gte(activities.scheduledAt, monthStart),
            lte(activities.scheduledAt, monthEnd)
          )
        );

      // Fetch active feeding schedules (recurring daily)
      const schedules = await db
        .select()
        .from(feedingSchedules)
        .where(
          and(
            eq(feedingSchedules.householdId, householdId),
            eq(feedingSchedules.isActive, true)
          )
        );

      // Fetch feeding logs for the month
      const monthStartStr = `${month}-01`;
      const lastDay = monthEnd.getDate();
      const monthEndStr = `${month}-${String(lastDay).padStart(2, "0")}`;
      const logs = await db
        .select()
        .from(feedingLogs)
        .where(
          and(
            eq(feedingLogs.householdId, householdId),
            gte(feedingLogs.feedingDate, monthStartStr),
            lte(feedingLogs.feedingDate, monthEndStr)
          )
        );

      // Fetch pets + members for name lookups
      const householdPets = await db
        .select()
        .from(pets)
        .where(eq(pets.householdId, householdId));
      const householdMembers = await db
        .select()
        .from(members)
        .where(eq(members.householdId, householdId));

      const petMap = new Map(householdPets.map((p) => [p.id, p.name]));
      const memberMap = new Map(householdMembers.map((m) => [m.id, m.displayName]));

      // Build log lookup: feedingScheduleId+date -> log
      const logMap = new Map<string, typeof logs[number]>();
      for (const log of logs) {
        logMap.set(`${log.feedingScheduleId}:${log.feedingDate}`, log);
      }

      // Group events by day
      const days: Record<string, CalendarEvent[]> = {};

      const addEvent = (dateKey: string, event: CalendarEvent) => {
        if (!days[dateKey]) days[dateKey] = [];
        days[dateKey].push(event);
      };

      // Add activities
      for (const act of monthActivities) {
        if (!act.scheduledAt) continue;
        const dateKey = act.scheduledAt.toISOString().split("T")[0];
        addEvent(dateKey, {
          id: act.id,
          kind: "activity",
          title: act.title,
          petId: act.petId,
          petName: petMap.get(act.petId) ?? "Unknown",
          memberId: act.memberId,
          memberName: memberMap.get(act.memberId) ?? null,
          type: act.type as CalendarEvent["type"],
          scheduledAt: act.scheduledAt.toISOString(),
          completedAt: act.completedAt?.toISOString() ?? null,
        });
      }

      // Add feeding schedules for each day of the month
      const daysInMonth = monthEnd.getDate();
      for (const sched of schedules) {
        for (let d = 1; d <= daysInMonth; d++) {
          const dateKey = `${month}-${String(d).padStart(2, "0")}`;
          const log = logMap.get(`${sched.id}:${dateKey}`);
          addEvent(dateKey, {
            id: `feeding-${sched.id}-${dateKey}`,
            kind: "feeding",
            title: `${sched.label} - ${petMap.get(sched.petId) ?? "Unknown"}`,
            petId: sched.petId,
            petName: petMap.get(sched.petId) ?? "Unknown",
            memberId: log?.completedBy ?? null,
            memberName: log?.completedBy ? (memberMap.get(log.completedBy) ?? null) : null,
            type: "feeding_schedule",
            scheduledAt: `${dateKey}T${sched.time}:00`,
            completedAt: log?.completedAt?.toISOString() ?? null,
          });
        }
      }

      // Add health records (vet visits, vaccinations, checkups, procedures)
      const monthHealthRecords = await db
        .select()
        .from(healthRecords)
        .where(
          and(
            eq(healthRecords.householdId, householdId),
            gte(healthRecords.date, monthStart),
            lte(healthRecords.date, monthEnd)
          )
        );

      for (const rec of monthHealthRecords) {
        const dateKey = rec.date.toISOString().split("T")[0];
        const label =
          rec.type === "vaccination"
            ? rec.vaccineName ?? "Vaccination"
            : rec.reason ?? rec.type.replace("_", " ");
        addEvent(dateKey, {
          id: `health-${rec.id}`,
          kind: "health",
          title: `${label} - ${petMap.get(rec.petId) ?? "Unknown"}`,
          petId: rec.petId,
          petName: petMap.get(rec.petId) ?? "Unknown",
          memberId: null,
          memberName: null,
          type: rec.type as CalendarEvent["type"],
          scheduledAt: rec.date.toISOString(),
          completedAt: null,
        });
      }

      // Add pet birthdays (use UTC to avoid timezone shift on midnight-UTC dates)
      for (const pet of householdPets) {
        if (!pet.dateOfBirth) continue;
        const dob = new Date(pet.dateOfBirth);
        if (dob.getUTCMonth() + 1 === mon) {
          const day = dob.getUTCDate();
          const dateKey = `${month}-${String(day).padStart(2, "0")}`;
          const age = year - dob.getUTCFullYear();
          const suffix = age === 1 ? "st" : age === 2 ? "nd" : age === 3 ? "rd" : "th";
          const title = age > 0
            ? `${pet.name}'s ${age}${suffix} Birthday`
            : `${pet.name}'s Birthday`;
          addEvent(dateKey, {
            id: `birthday-${pet.id}-${year}`,
            kind: "birthday",
            title,
            petId: pet.id,
            petName: pet.name,
            memberId: null,
            memberName: null,
            type: "birthday",
            scheduledAt: `${dateKey}T00:00:00`,
            completedAt: null,
          });
        }
      }

      // Add pet holidays for this month
      for (const holiday of PET_HOLIDAYS) {
        if (holiday.month === mon) {
          const dateKey = `${month}-${String(holiday.day).padStart(2, "0")}`;
          addEvent(dateKey, {
            id: `holiday-${holiday.month}-${holiday.day}`,
            kind: "holiday",
            title: holiday.name,
            petId: "",
            petName: "",
            memberId: null,
            memberName: null,
            type: "holiday",
            scheduledAt: `${dateKey}T00:00:00`,
            completedAt: null,
          });
        }
      }

      // Sort events within each day by time (birthdays/holidays first since 00:00)
      for (const dateKey of Object.keys(days)) {
        days[dateKey].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
      }

      const result: CalendarMonthData = { month, days };
      return result;
    }),

  upcoming: householdProcedure
    .input(calendarUpcomingInputSchema)
    .query(async ({ ctx, input }) => {
      const { householdId } = ctx;
      const limit = input.limit ?? 5;
      const now = new Date();

      // Fetch upcoming activities (scheduled in the future, not completed)
      const upcomingActivities = await db
        .select()
        .from(activities)
        .where(
          and(
            eq(activities.householdId, householdId),
            gte(activities.scheduledAt, now),
            isNull(activities.completedAt)
          )
        )
        .orderBy(asc(activities.scheduledAt))
        .limit(limit);

      // Fetch active feeding schedules
      const schedules = await db
        .select()
        .from(feedingSchedules)
        .where(
          and(
            eq(feedingSchedules.householdId, householdId),
            eq(feedingSchedules.isActive, true)
          )
        );

      // Check today's feeding logs
      const today = now.toISOString().split("T")[0];
      const todayLogs = await db
        .select()
        .from(feedingLogs)
        .where(
          and(
            eq(feedingLogs.householdId, householdId),
            eq(feedingLogs.feedingDate, today)
          )
        );

      const loggedScheduleIds = new Set(todayLogs.map((l) => l.feedingScheduleId));

      // Fetch pets + members
      const householdPets = await db
        .select()
        .from(pets)
        .where(eq(pets.householdId, householdId));
      const householdMembers = await db
        .select()
        .from(members)
        .where(eq(members.householdId, householdId));

      const petMap = new Map(householdPets.map((p) => [p.id, p.name]));
      const memberMap = new Map(householdMembers.map((m) => [m.id, m.displayName]));

      const events: CalendarEvent[] = [];

      // Add upcoming activities
      for (const act of upcomingActivities) {
        if (!act.scheduledAt) continue;
        events.push({
          id: act.id,
          kind: "activity",
          title: act.title,
          petId: act.petId,
          petName: petMap.get(act.petId) ?? "Unknown",
          memberId: act.memberId,
          memberName: memberMap.get(act.memberId) ?? null,
          type: act.type as CalendarEvent["type"],
          scheduledAt: act.scheduledAt.toISOString(),
          completedAt: null,
        });
      }

      // Add upcoming health records (future vet visits, vaccinations, etc.)
      const upcomingHealth = await db
        .select()
        .from(healthRecords)
        .where(
          and(
            eq(healthRecords.householdId, householdId),
            gte(healthRecords.date, now)
          )
        )
        .orderBy(asc(healthRecords.date))
        .limit(limit);

      for (const rec of upcomingHealth) {
        const label =
          rec.type === "vaccination"
            ? rec.vaccineName ?? "Vaccination"
            : rec.reason ?? rec.type.replace("_", " ");
        events.push({
          id: `health-${rec.id}`,
          kind: "health",
          title: `${label} - ${petMap.get(rec.petId) ?? "Unknown"}`,
          petId: rec.petId,
          petName: petMap.get(rec.petId) ?? "Unknown",
          memberId: null,
          memberName: null,
          type: rec.type as CalendarEvent["type"],
          scheduledAt: rec.date.toISOString(),
          completedAt: null,
        });
      }

      // Add today's remaining feedings
      const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      for (const sched of schedules) {
        if (loggedScheduleIds.has(sched.id)) continue;
        if (sched.time < nowTime) continue; // already past
        events.push({
          id: `feeding-${sched.id}-${today}`,
          kind: "feeding",
          title: `${sched.label} - ${petMap.get(sched.petId) ?? "Unknown"}`,
          petId: sched.petId,
          petName: petMap.get(sched.petId) ?? "Unknown",
          memberId: null,
          memberName: null,
          type: "feeding_schedule",
          scheduledAt: `${today}T${sched.time}:00`,
          completedAt: null,
        });
      }

      // Add upcoming pet birthdays (next 30 days, use UTC for date extraction)
      for (const pet of householdPets) {
        if (!pet.dateOfBirth) continue;
        const dob = new Date(pet.dateOfBirth);
        const dobMonth = dob.getUTCMonth();
        const dobDay = dob.getUTCDate();
        // Build this year's birthday (use UTC to construct consistently)
        let bday = new Date(Date.UTC(now.getFullYear(), dobMonth, dobDay));
        // If already passed this year, use next year's
        if (bday.getTime() < now.getTime()) {
          bday = new Date(Date.UTC(now.getFullYear() + 1, dobMonth, dobDay));
        }
        const diffDays = (bday.getTime() - now.getTime()) / 86400000;
        if (diffDays <= 30) {
          const bdayStr = `${bday.getUTCFullYear()}-${String(bday.getUTCMonth() + 1).padStart(2, "0")}-${String(bday.getUTCDate()).padStart(2, "0")}`;
          const age = bday.getUTCFullYear() - dob.getUTCFullYear();
          const suffix = age === 1 ? "st" : age === 2 ? "nd" : age === 3 ? "rd" : "th";
          const title = age > 0
            ? `${pet.name}'s ${age}${suffix} Birthday`
            : `${pet.name}'s Birthday`;
          events.push({
            id: `birthday-${pet.id}-${bday.getFullYear()}`,
            kind: "birthday",
            title,
            petId: pet.id,
            petName: pet.name,
            memberId: null,
            memberName: null,
            type: "birthday",
            scheduledAt: `${bdayStr}T00:00:00`,
            completedAt: null,
          });
        }
      }

      // Add upcoming pet holidays (next 7 days)
      for (let d = 0; d <= 7; d++) {
        const futureDate = new Date(now.getTime() + d * 86400000);
        const fMonth = futureDate.getMonth() + 1;
        const fDay = futureDate.getDate();
        const dateStr = `${futureDate.getFullYear()}-${String(fMonth).padStart(2, "0")}-${String(fDay).padStart(2, "0")}`;
        for (const holiday of PET_HOLIDAYS) {
          if (holiday.month === fMonth && holiday.day === fDay) {
            events.push({
              id: `holiday-${holiday.month}-${holiday.day}`,
              kind: "holiday",
              title: holiday.name,
              petId: "",
              petName: "",
              memberId: null,
              memberName: null,
              type: "holiday",
              scheduledAt: `${dateStr}T00:00:00`,
              completedAt: null,
            });
          }
        }
      }

      // Sort by scheduledAt ascending
      events.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

      // Trim to limit
      const trimmed = events.slice(0, limit);

      const result: UpcomingCalendarEvents = {
        events: trimmed,
        totalUpcoming: events.length,
      };
      return result;
    }),
});
