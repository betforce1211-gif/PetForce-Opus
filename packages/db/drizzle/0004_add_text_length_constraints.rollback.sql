-- Rollback: 0004_add_text_length_constraints.sql
-- Reverses: CHECK constraints on text/jsonb column lengths

ALTER TABLE "pets" DROP CONSTRAINT IF EXISTS "pets_medical_notes_length";
ALTER TABLE "pet_notes" DROP CONSTRAINT IF EXISTS "pet_notes_content_length";
ALTER TABLE "activity_log" DROP CONSTRAINT IF EXISTS "activity_log_metadata_length";
ALTER TABLE "analytics_events" DROP CONSTRAINT IF EXISTS "analytics_events_metadata_length";
