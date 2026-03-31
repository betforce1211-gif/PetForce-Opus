-- Rollback: 0002_secret_synch.sql
-- Reverses: Composite indexes for query optimization

DROP INDEX IF EXISTS "pet_photos_uploaded_by_idx";
DROP INDEX IF EXISTS "pet_notes_pet_idx";
DROP INDEX IF EXISTS "pet_notes_household_idx";
DROP INDEX IF EXISTS "pet_game_stats_household_idx";
DROP INDEX IF EXISTS "member_game_stats_household_idx";
DROP INDEX IF EXISTS "medications_household_active_idx";
DROP INDEX IF EXISTS "invitations_household_status_idx";
DROP INDEX IF EXISTS "health_records_household_date_idx";
DROP INDEX IF EXISTS "feeding_schedules_household_active_idx";
DROP INDEX IF EXISTS "expenses_household_date_idx";
DROP INDEX IF EXISTS "analytics_events_household_created_idx";
DROP INDEX IF EXISTS "analytics_events_user_created_idx";
DROP INDEX IF EXISTS "activity_log_performed_by_created_idx";
DROP INDEX IF EXISTS "activities_household_completed_idx";
DROP INDEX IF EXISTS "activities_household_scheduled_idx";
DROP INDEX IF EXISTS "access_requests_household_status_idx";
