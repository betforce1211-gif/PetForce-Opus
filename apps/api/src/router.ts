import { router } from "./trpc";
import { householdRouter } from "./routers/household";
import { petRouter } from "./routers/pet";
import { activityRouter } from "./routers/activity";

export const appRouter = router({
  household: householdRouter,
  pet: petRouter,
  activity: activityRouter,
});

export type AppRouter = typeof appRouter;
