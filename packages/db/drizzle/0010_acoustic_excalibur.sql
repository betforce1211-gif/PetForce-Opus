ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "expo_push_token" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "email" text;--> statement-breakpoint
ALTER TABLE "pet_photos" ADD COLUMN IF NOT EXISTS "activity_id" uuid;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "expo_push_token" text;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "email" text;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "pet_photos" ADD CONSTRAINT "pet_photos_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feeding_logs_household_completed_at_idx" ON "feeding_logs" USING btree ("household_id","completed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_logs_household_idx" ON "medication_logs" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_logs_household_logged_date_idx" ON "medication_logs" USING btree ("household_id","logged_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pet_photos_activity_idx" ON "pet_photos" USING btree ("activity_id");--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_metadata_length" CHECK (length("activity_log"."metadata"::text) <= 10240);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_metadata_length" CHECK (length("analytics_events"."metadata"::text) <= 10240);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "pet_notes" ADD CONSTRAINT "pet_notes_content_length" CHECK (length("pet_notes"."content") <= 51200);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "pets" ADD CONSTRAINT "pets_medical_notes_length" CHECK (length("pets"."medical_notes") <= 10240);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
