CREATE TABLE "medication_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"baby_id" integer NOT NULL,
	"logged_by_user_id" integer NOT NULL,
	"medication_type" text NOT NULL,
	"medication_type_id" text NOT NULL,
	"amount" integer NOT NULL,
	"unit" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "feed_log" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "medication_log" ADD CONSTRAINT "medication_log_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_log" ADD CONSTRAINT "medication_log_logged_by_user_id_user_id_fk" FOREIGN KEY ("logged_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "medication_log_baby_started_at_idx" ON "medication_log" USING btree ("baby_id","started_at");