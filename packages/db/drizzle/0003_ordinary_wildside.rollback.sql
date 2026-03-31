-- Rollback: 0003_ordinary_wildside.sql
-- Reverses: date type columns back to text
-- NOTE: Converting date back to text is lossy-safe (date renders as 'YYYY-MM-DD' text).

ALTER TABLE "feeding_logs" ALTER COLUMN "feeding_date" SET DATA TYPE text USING "feeding_date"::text;
ALTER TABLE "feeding_snoozes" ALTER COLUMN "snooze_date" SET DATA TYPE text USING "snooze_date"::text;
ALTER TABLE "household_game_stats" ALTER COLUMN "last_active_date" SET DATA TYPE text USING "last_active_date"::text;
ALTER TABLE "medication_logs" ALTER COLUMN "logged_date" SET DATA TYPE text USING "logged_date"::text;
ALTER TABLE "medication_snoozes" ALTER COLUMN "snooze_date" SET DATA TYPE text USING "snooze_date"::text;
ALTER TABLE "member_game_stats" ALTER COLUMN "last_active_date" SET DATA TYPE text USING "last_active_date"::text;
ALTER TABLE "pet_game_stats" ALTER COLUMN "last_active_date" SET DATA TYPE text USING "last_active_date"::text;
