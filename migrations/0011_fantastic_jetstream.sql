CREATE TYPE "public"."invite_type_enum" AS ENUM('passkey', 'email');--> statement-breakpoint
ALTER TABLE "baby_invites" ALTER COLUMN "invited_email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "baby_invites" ALTER COLUMN "access_level" SET DEFAULT 'editor';--> statement-breakpoint
ALTER TABLE "baby_invites" ADD COLUMN "invite_type" "invite_type_enum" DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "baby_invites" ADD COLUMN "token_hash" text;--> statement-breakpoint
ALTER TABLE "baby_invites" ADD COLUMN "token_prefix" text;--> statement-breakpoint
ALTER TABLE "baby_invites" ADD COLUMN "accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "baby_invites" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "baby_invites" ADD COLUMN "max_uses" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "baby_invites" ADD COLUMN "uses_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "baby_invites_token_hash_idx" ON "baby_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "baby_invites_baby_id_status_idx" ON "baby_invites" USING btree ("baby_id","status");--> statement-breakpoint
ALTER TABLE "baby_invites" ADD CONSTRAINT "baby_invites_token_hash_unique" UNIQUE("token_hash");