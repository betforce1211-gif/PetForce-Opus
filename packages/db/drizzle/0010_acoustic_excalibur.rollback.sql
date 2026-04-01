ALTER TABLE "pets" DROP CONSTRAINT IF EXISTS "pets_medical_notes_length";--> statement-breakpoint
ALTER TABLE "pet_notes" DROP CONSTRAINT IF EXISTS "pet_notes_content_length";--> statement-breakpoint
ALTER TABLE "analytics_events" DROP CONSTRAINT IF EXISTS "analytics_events_metadata_length";--> statement-breakpoint
ALTER TABLE "activity_log" DROP CONSTRAINT IF EXISTS "activity_log_metadata_length";--> statement-breakpoint
DROP INDEX IF EXISTS "pet_photos_activity_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "medication_logs_household_logged_date_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "medication_logs_household_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "feeding_logs_household_completed_at_idx";--> statement-breakpoint
ALTER TABLE "pet_photos" DROP CONSTRAINT IF EXISTS "pet_photos_activity_id_activities_id_fk";--> statement-breakpoint
ALTER TABLE "pets" DROP COLUMN IF EXISTS "email";--> statement-breakpoint
ALTER TABLE "pets" DROP COLUMN IF EXISTS "expo_push_token";--> statement-breakpoint
ALTER TABLE "pet_photos" DROP COLUMN IF EXISTS "activity_id";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN IF EXISTS "email";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN IF EXISTS "expo_push_token";
