CREATE TYPE "public"."gender_enum" AS ENUM('male', 'female', 'other', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."hand_preference_enum" AS ENUM('left', 'right', 'both', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."invite_status_enum" AS ENUM('pending', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TABLE "baby_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"baby_id" integer NOT NULL,
	"inviter_user_id" integer NOT NULL,
	"invited_email" text NOT NULL,
	"invited_user_id" integer,
	"access_level" "access_level_enum" DEFAULT 'viewer' NOT NULL,
	"status" "invite_status_enum" DEFAULT 'pending' NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "baby_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "babies" ALTER COLUMN "birth_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "babies" ADD COLUMN "gender" "gender_enum";--> statement-breakpoint
ALTER TABLE "babies" ADD COLUMN "birth_weight_g" integer;--> statement-breakpoint
ALTER TABLE "baby_access" ADD COLUMN "caregiver_label" text;--> statement-breakpoint
ALTER TABLE "baby_access" ADD COLUMN "last_accessed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "hand_preference" "hand_preference_enum" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "default_baby_id" integer;--> statement-breakpoint
ALTER TABLE "baby_invites" ADD CONSTRAINT "baby_invites_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_invites" ADD CONSTRAINT "baby_invites_inviter_user_id_user_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_invites" ADD CONSTRAINT "baby_invites_invited_user_id_user_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "baby_invites_token_idx" ON "baby_invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX "baby_invites_invited_email_idx" ON "baby_invites" USING btree ("invited_email");--> statement-breakpoint
CREATE INDEX "baby_invites_invited_user_id_idx" ON "baby_invites" USING btree ("invited_user_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_default_baby_id_babies_id_fk" FOREIGN KEY ("default_baby_id") REFERENCES "public"."babies"("id") ON DELETE set null ON UPDATE no action;