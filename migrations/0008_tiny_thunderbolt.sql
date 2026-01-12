CREATE TYPE "public"."sync_op_enum" AS ENUM('create', 'update', 'delete');--> statement-breakpoint
CREATE TABLE "sync_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"baby_id" integer NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"op" "sync_op_enum" NOT NULL,
	"payload" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sync_events_baby_id_idx" ON "sync_events" USING btree ("baby_id","id");