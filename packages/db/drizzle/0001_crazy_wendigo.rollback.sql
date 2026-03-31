-- Rollback: 0001_crazy_wendigo.sql
-- Reverses: Phase 2 tables (feeding, meds, health, game stats, expenses, etc.),
--           activities.completed_by column, foreign keys, and indexes.
-- WARNING: This will DROP all phase-2 tables and their data.

-- Drop indexes added to pre-existing tables
DROP INDEX IF EXISTS "pets_household_idx";
DROP INDEX IF EXISTS "members_user_idx";
DROP INDEX IF EXISTS "members_household_user_idx";
DROP INDEX IF EXISTS "invitations_household_idx";
DROP INDEX IF EXISTS "activities_pet_idx";
DROP INDEX IF EXISTS "activities_household_idx";

-- Drop FK on activities.completed_by
ALTER TABLE "activities" DROP CONSTRAINT IF EXISTS "activities_completed_by_members_id_fk";

-- Drop indexes on new tables
DROP INDEX IF EXISTS "pet_photos_household_idx";
DROP INDEX IF EXISTS "pet_photos_pet_idx";
DROP INDEX IF EXISTS "medications_household_idx";
DROP INDEX IF EXISTS "medication_snoozes_medication_date_member_idx";
DROP INDEX IF EXISTS "medication_logs_medication_date_member_idx";
DROP INDEX IF EXISTS "health_records_household_idx";
DROP INDEX IF EXISTS "feeding_snoozes_schedule_date_member_idx";
DROP INDEX IF EXISTS "feeding_schedules_household_idx";
DROP INDEX IF EXISTS "feeding_logs_schedule_date_member_idx";
DROP INDEX IF EXISTS "feeding_logs_household_idx";
DROP INDEX IF EXISTS "expenses_household_idx";
DROP INDEX IF EXISTS "activity_log_household_created_idx";

-- Drop foreign keys on new tables (all will cascade with table drops, but explicit for clarity)
ALTER TABLE "pet_photos" DROP CONSTRAINT IF EXISTS "pet_photos_uploaded_by_members_id_fk";
ALTER TABLE "pet_photos" DROP CONSTRAINT IF EXISTS "pet_photos_pet_id_pets_id_fk";
ALTER TABLE "pet_photos" DROP CONSTRAINT IF EXISTS "pet_photos_household_id_households_id_fk";
ALTER TABLE "pet_notes" DROP CONSTRAINT IF EXISTS "pet_notes_pet_id_pets_id_fk";
ALTER TABLE "pet_notes" DROP CONSTRAINT IF EXISTS "pet_notes_household_id_households_id_fk";
ALTER TABLE "pet_game_stats" DROP CONSTRAINT IF EXISTS "pet_game_stats_household_id_households_id_fk";
ALTER TABLE "pet_game_stats" DROP CONSTRAINT IF EXISTS "pet_game_stats_pet_id_pets_id_fk";
ALTER TABLE "member_game_stats" DROP CONSTRAINT IF EXISTS "member_game_stats_household_id_households_id_fk";
ALTER TABLE "member_game_stats" DROP CONSTRAINT IF EXISTS "member_game_stats_member_id_members_id_fk";
ALTER TABLE "medications" DROP CONSTRAINT IF EXISTS "medications_pet_id_pets_id_fk";
ALTER TABLE "medications" DROP CONSTRAINT IF EXISTS "medications_household_id_households_id_fk";
ALTER TABLE "medication_snoozes" DROP CONSTRAINT IF EXISTS "medication_snoozes_snoozed_by_members_id_fk";
ALTER TABLE "medication_snoozes" DROP CONSTRAINT IF EXISTS "medication_snoozes_household_id_households_id_fk";
ALTER TABLE "medication_snoozes" DROP CONSTRAINT IF EXISTS "medication_snoozes_medication_id_medications_id_fk";
ALTER TABLE "medication_logs" DROP CONSTRAINT IF EXISTS "medication_logs_logged_by_members_id_fk";
ALTER TABLE "medication_logs" DROP CONSTRAINT IF EXISTS "medication_logs_household_id_households_id_fk";
ALTER TABLE "medication_logs" DROP CONSTRAINT IF EXISTS "medication_logs_medication_id_medications_id_fk";
ALTER TABLE "household_game_stats" DROP CONSTRAINT IF EXISTS "household_game_stats_household_id_households_id_fk";
ALTER TABLE "health_records" DROP CONSTRAINT IF EXISTS "health_records_pet_id_pets_id_fk";
ALTER TABLE "health_records" DROP CONSTRAINT IF EXISTS "health_records_household_id_households_id_fk";
ALTER TABLE "feeding_snoozes" DROP CONSTRAINT IF EXISTS "feeding_snoozes_snoozed_by_members_id_fk";
ALTER TABLE "feeding_snoozes" DROP CONSTRAINT IF EXISTS "feeding_snoozes_household_id_households_id_fk";
ALTER TABLE "feeding_snoozes" DROP CONSTRAINT IF EXISTS "feeding_snoozes_feeding_schedule_id_feeding_schedules_id_fk";
ALTER TABLE "feeding_logs" DROP CONSTRAINT IF EXISTS "feeding_logs_completed_by_members_id_fk";
ALTER TABLE "feeding_logs" DROP CONSTRAINT IF EXISTS "feeding_logs_pet_id_pets_id_fk";
ALTER TABLE "feeding_logs" DROP CONSTRAINT IF EXISTS "feeding_logs_household_id_households_id_fk";
ALTER TABLE "feeding_logs" DROP CONSTRAINT IF EXISTS "feeding_logs_feeding_schedule_id_feeding_schedules_id_fk";
ALTER TABLE "feeding_schedules" DROP CONSTRAINT IF EXISTS "feeding_schedules_pet_id_pets_id_fk";
ALTER TABLE "feeding_schedules" DROP CONSTRAINT IF EXISTS "feeding_schedules_household_id_households_id_fk";
ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_pet_id_pets_id_fk";
ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_household_id_households_id_fk";
ALTER TABLE "analytics_events" DROP CONSTRAINT IF EXISTS "analytics_events_household_id_households_id_fk";
ALTER TABLE "activity_log" DROP CONSTRAINT IF EXISTS "activity_log_performed_by_members_id_fk";
ALTER TABLE "activity_log" DROP CONSTRAINT IF EXISTS "activity_log_household_id_households_id_fk";

-- Drop new tables (reverse order)
DROP TABLE IF EXISTS "pet_photos";
DROP TABLE IF EXISTS "pet_notes";
DROP TABLE IF EXISTS "pet_game_stats";
DROP TABLE IF EXISTS "member_game_stats";
DROP TABLE IF EXISTS "household_game_stats";
DROP TABLE IF EXISTS "medication_snoozes";
DROP TABLE IF EXISTS "medication_logs";
DROP TABLE IF EXISTS "medications";
DROP TABLE IF EXISTS "health_records";
DROP TABLE IF EXISTS "feeding_snoozes";
DROP TABLE IF EXISTS "feeding_logs";
DROP TABLE IF EXISTS "feeding_schedules";
DROP TABLE IF EXISTS "expenses";
DROP TABLE IF EXISTS "analytics_events";
DROP TABLE IF EXISTS "activity_log";

-- Remove the completed_by column added to activities
ALTER TABLE "activities" DROP COLUMN IF EXISTS "completed_by";
