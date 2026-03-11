import { router } from "./trpc.js";
import { householdRouter } from "./routers/household.js";
import { petRouter } from "./routers/pet.js";
import { activityRouter } from "./routers/activity.js";
import { memberRouter } from "./routers/member.js";
import { dashboardRouter } from "./routers/dashboard.js";
import { invitationRouter } from "./routers/invitation.js";
import { accessRequestRouter } from "./routers/access-request.js";
import { feedingRouter } from "./routers/feeding.js";
import { calendarRouter } from "./routers/calendar.js";
import { healthRouter } from "./routers/health.js";
import { financeRouter } from "./routers/finance.js";
import { notesRouter } from "./routers/notes.js";
import { reportingRouter } from "./routers/reporting.js";
import { analyticsRouter } from "./routers/analytics.js";
import { gamificationRouter } from "./routers/gamification.js";
import { petPhotoRouter } from "./routers/pet-photo.js";
import { exportRouter } from "./routers/export.js";

export const appRouter = router({
  household: householdRouter,
  pet: petRouter,
  activity: activityRouter,
  member: memberRouter,
  dashboard: dashboardRouter,
  invitation: invitationRouter,
  accessRequest: accessRequestRouter,
  feeding: feedingRouter,
  calendar: calendarRouter,
  health: healthRouter,
  finance: financeRouter,
  notes: notesRouter,
  reporting: reportingRouter,
  analytics: analyticsRouter,
  gamification: gamificationRouter,
  petPhoto: petPhotoRouter,
  export: exportRouter,
});

export type AppRouter = typeof appRouter;
