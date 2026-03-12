CREATE INDEX IF NOT EXISTS "access_requests_household_status_idx" ON "access_requests" USING btree ("household_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activities_household_scheduled_idx" ON "activities" USING btree ("household_id","scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activities_household_completed_idx" ON "activities" USING btree ("household_id","completed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_log_performed_by_created_idx" ON "activity_log" USING btree ("performed_by","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_user_created_idx" ON "analytics_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_household_created_idx" ON "analytics_events" USING btree ("household_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_household_date_idx" ON "expenses" USING btree ("household_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feeding_schedules_household_active_idx" ON "feeding_schedules" USING btree ("household_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_records_household_date_idx" ON "health_records" USING btree ("household_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitations_household_status_idx" ON "invitations" USING btree ("household_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medications_household_active_idx" ON "medications" USING btree ("household_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_game_stats_household_idx" ON "member_game_stats" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pet_game_stats_household_idx" ON "pet_game_stats" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pet_notes_household_idx" ON "pet_notes" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pet_notes_pet_idx" ON "pet_notes" USING btree ("pet_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pet_photos_uploaded_by_idx" ON "pet_photos" USING btree ("uploaded_by");