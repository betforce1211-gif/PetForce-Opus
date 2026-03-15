-- Composite indexes for reporting UNION ALL queries.
-- These enable efficient index scans on (household_id, date) for the
-- reporting router's date-range filtered queries.
-- activities already has activities_household_completed_idx(household_id, completed_at).

CREATE INDEX IF NOT EXISTS "feeding_logs_household_completed_at_idx"
  ON "feeding_logs" ("household_id", "completed_at");

CREATE INDEX IF NOT EXISTS "medication_logs_household_logged_date_idx"
  ON "medication_logs" ("household_id", "logged_date");
