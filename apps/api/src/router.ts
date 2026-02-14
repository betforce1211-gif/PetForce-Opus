import { router } from "./trpc";
import { householdRouter } from "./routers/household";
import { petRouter } from "./routers/pet";
import { activityRouter } from "./routers/activity";
import { memberRouter } from "./routers/member";
import { dashboardRouter } from "./routers/dashboard";
import { invitationRouter } from "./routers/invitation";
import { accessRequestRouter } from "./routers/access-request";
import { feedingRouter } from "./routers/feeding";
import { calendarRouter } from "./routers/calendar";

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
});

export type AppRouter = typeof appRouter;
