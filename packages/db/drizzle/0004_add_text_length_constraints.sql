ALTER TABLE "pets" ADD CONSTRAINT "pets_medical_notes_length" CHECK (length("medical_notes") <= 10240);--> statement-breakpoint
ALTER TABLE "pet_notes" ADD CONSTRAINT "pet_notes_content_length" CHECK (length("content") <= 51200);--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_metadata_length" CHECK (length("metadata"::text) <= 10240);--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_metadata_length" CHECK (length("metadata"::text) <= 10240);
