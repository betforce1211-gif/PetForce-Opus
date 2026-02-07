import { router } from "./trpc";
import { householdRouter } from "./routers/household";
import { petRouter } from "./routers/pet";
import { activityRouter } from "./routers/activity";
import { memberRouter } from "./routers/member";
import { dashboardRouter } from "./routers/dashboard";

export const appRouter = router({
  household: householdRouter,
  pet: petRouter,
  activity: activityRouter,
  member: memberRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
