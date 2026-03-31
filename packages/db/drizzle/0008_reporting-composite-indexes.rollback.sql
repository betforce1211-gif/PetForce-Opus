-- Rollback: 0008_reporting-composite-indexes.sql
-- Reverses: Composite indexes for reporting UNION ALL queries

DROP INDEX IF EXISTS "medication_logs_household_logged_date_idx";
DROP INDEX IF EXISTS "feeding_logs_household_completed_at_idx";
