CREATE TYPE "public"."access_level_enum" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "babies" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_user_id" integer,
	"name" text NOT NULL,
	"birth_date" timestamp NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "baby_access" (
	"baby_id" integer,
	"user_id" integer,
	"access_level" "access_level_enum" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "baby_access_baby_id_user_id_pk" PRIMARY KEY("baby_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "baby_measurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"baby_id" integer NOT NULL,
	"measured_at" timestamp DEFAULT now() NOT NULL,
	"weights_g" integer NOT NULL,
	"heights_mm" integer NOT NULL,
	"head_circumferences_mm" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "feed_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"baby_id" integer NOT NULL,
	"method" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"amount_ml" integer,
	"is_estimated" boolean DEFAULT false NOT NULL,
	"estimated_source" text,
	"end_side" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_id" text,
	"locked" boolean DEFAULT false,
	"use_metric" boolean DEFAULT true NOT NULL,
	"color_theme" text DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "user_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "counter" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "counter" ALTER COLUMN "updated_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "counter" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "counter" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "counter" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "babies" ADD CONSTRAINT "babies_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_access" ADD CONSTRAINT "baby_access_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_access" ADD CONSTRAINT "baby_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_measurements" ADD CONSTRAINT "baby_measurements_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_log" ADD CONSTRAINT "feed_log_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "baby_access_user_id_idx" ON "baby_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "baby_measurements_baby_measured_at_idx" ON "baby_measurements" USING btree ("baby_id","measured_at");--> statement-breakpoint
CREATE INDEX "feed_log_baby_started_at_idx" ON "feed_log" USING btree ("baby_id","started_at");