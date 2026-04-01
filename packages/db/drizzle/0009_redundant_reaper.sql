CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"badge_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"group" text NOT NULL,
	"category" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "achievements_badge_id_unique" UNIQUE("badge_id")
);
--> statement-breakpoint
CREATE TABLE "gamification_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"household_id" uuid NOT NULL,
	"achievement_id" uuid NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "expo_push_token" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "pet_photos" ADD COLUMN "activity_id" uuid;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "expo_push_token" text;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "gamification_config" ADD CONSTRAINT "gamification_config_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gamification_config" ADD CONSTRAINT "gamification_config_updated_by_members_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_achievements" ADD CONSTRAINT "member_achievements_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_achievements" ADD CONSTRAINT "member_achievements_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_achievements" ADD CONSTRAINT "member_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "achievements_group_category_idx" ON "achievements" USING btree ("group","category");--> statement-breakpoint
CREATE UNIQUE INDEX "gamification_config_household_key_idx" ON "gamification_config" USING btree ("household_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "member_achievements_member_achievement_idx" ON "member_achievements" USING btree ("member_id","achievement_id");--> statement-breakpoint
CREATE INDEX "member_achievements_household_idx" ON "member_achievements" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "member_achievements_unlocked_at_idx" ON "member_achievements" USING btree ("unlocked_at");--> statement-breakpoint
ALTER TABLE "pet_photos" ADD CONSTRAINT "pet_photos_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feeding_logs_household_completed_at_idx" ON "feeding_logs" USING btree ("household_id","completed_at");--> statement-breakpoint
CREATE INDEX "medication_logs_household_idx" ON "medication_logs" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "medication_logs_household_logged_date_idx" ON "medication_logs" USING btree ("household_id","logged_date");--> statement-breakpoint
CREATE INDEX "pet_photos_activity_idx" ON "pet_photos" USING btree ("activity_id");--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_metadata_length" CHECK (length("activity_log"."metadata"::text) <= 10240);--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_metadata_length" CHECK (length("analytics_events"."metadata"::text) <= 10240);--> statement-breakpoint
ALTER TABLE "pet_notes" ADD CONSTRAINT "pet_notes_content_length" CHECK (length("pet_notes"."content") <= 51200);--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_medical_notes_length" CHECK (length("pets"."medical_notes") <= 10240);