CREATE TABLE "user_ui_config" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"key_updated_at" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_ui_config" ADD CONSTRAINT "user_ui_config_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;