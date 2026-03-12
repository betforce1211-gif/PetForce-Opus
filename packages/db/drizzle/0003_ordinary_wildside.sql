ALTER TABLE "feeding_logs" ALTER COLUMN "feeding_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "feeding_snoozes" ALTER COLUMN "snooze_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "household_game_stats" ALTER COLUMN "last_active_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "medication_logs" ALTER COLUMN "logged_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "medication_snoozes" ALTER COLUMN "snooze_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "member_game_stats" ALTER COLUMN "last_active_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "pet_game_stats" ALTER COLUMN "last_active_date" SET DATA TYPE date;