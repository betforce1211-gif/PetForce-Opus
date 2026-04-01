ALTER TABLE "pet_photos" ADD COLUMN "thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "pet_photos" ADD COLUMN "medium_url" text;--> statement-breakpoint
ALTER TABLE "pet_photos" ADD COLUMN "webp_url" text;--> statement-breakpoint
ALTER TABLE "pet_photos" ADD COLUMN "blur_hash" text;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "avatar_thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "avatar_blur_hash" text;
