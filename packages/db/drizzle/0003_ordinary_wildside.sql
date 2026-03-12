ALTER TABLE "feeding_logs" ALTER COLUMN "feeding_date" SET DATA TYPE date USING "feeding_date"::date;--> statement-breakpoint
ALTER TABLE "feeding_snoozes" ALTER COLUMN "snooze_date" SET DATA TYPE date USING "snooze_date"::date;--> statement-breakpoint
ALTER TABLE "household_game_stats" ALTER COLUMN "last_active_date" SET DATA TYPE date USING "last_active_date"::date;--> statement-breakpoint
ALTER TABLE "medication_logs" ALTER COLUMN "logged_date" SET DATA TYPE date USING "logged_date"::date;--> statement-breakpoint
ALTER TABLE "medication_snoozes" ALTER COLUMN "snooze_date" SET DATA TYPE date USING "snooze_date"::date;--> statement-breakpoint
ALTER TABLE "member_game_stats" ALTER COLUMN "last_active_date" SET DATA TYPE date USING "last_active_date"::date;--> statement-breakpoint
ALTER TABLE "pet_game_stats" ALTER COLUMN "last_active_date" SET DATA TYPE date USING "last_active_date"::date;
