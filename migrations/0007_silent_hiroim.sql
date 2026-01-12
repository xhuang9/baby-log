CREATE TYPE "public"."nappy_type_enum" AS ENUM('wee', 'poo', 'mixed', 'dry');--> statement-breakpoint
CREATE TABLE "nappy_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"baby_id" integer NOT NULL,
	"logged_by_user_id" integer NOT NULL,
	"type" "nappy_type_enum",
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "nappy_log" ADD CONSTRAINT "nappy_log_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nappy_log" ADD CONSTRAINT "nappy_log_logged_by_user_id_user_id_fk" FOREIGN KEY ("logged_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nappy_log_baby_started_at_idx" ON "nappy_log" USING btree ("baby_id","started_at");