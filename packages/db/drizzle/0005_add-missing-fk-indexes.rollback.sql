-- Rollback: 0005_add-missing-fk-indexes.sql
-- Reverses: Foreign key indexes added for query performance

DROP INDEX IF EXISTS "medication_logs_logged_by_idx";
DROP INDEX IF EXISTS "invitations_invited_by_idx";
DROP INDEX IF EXISTS "feeding_logs_completed_by_idx";
DROP INDEX IF EXISTS "activity_log_subject_id_idx";
