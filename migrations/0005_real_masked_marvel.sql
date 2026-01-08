ALTER TABLE "feed_log" ADD COLUMN "logged_by_user_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "feed_log" ADD COLUMN "duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "feed_log" ADD CONSTRAINT "feed_log_logged_by_user_id_user_id_fk" FOREIGN KEY ("logged_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;