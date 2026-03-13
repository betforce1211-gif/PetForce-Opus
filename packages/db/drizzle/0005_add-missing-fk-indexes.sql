CREATE INDEX IF NOT EXISTS "activity_log_subject_id_idx" ON "activity_log" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feeding_logs_completed_by_idx" ON "feeding_logs" USING btree ("completed_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitations_invited_by_idx" ON "invitations" USING btree ("invited_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_logs_logged_by_idx" ON "medication_logs" USING btree ("logged_by");