-- Drop the plain-text token column from baby_invites
-- First drop the unique constraint and index on token
ALTER TABLE "baby_invites" DROP CONSTRAINT IF EXISTS "baby_invites_token_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "baby_invites_token_idx";--> statement-breakpoint

-- Drop the token column
ALTER TABLE "baby_invites" DROP COLUMN IF EXISTS "token";--> statement-breakpoint

-- Make token_hash NOT NULL (backfill any NULLs first if needed)
UPDATE "baby_invites" SET "token_hash" = 'migrated_' || "id" WHERE "token_hash" IS NULL;--> statement-breakpoint
ALTER TABLE "baby_invites" ALTER COLUMN "token_hash" SET NOT NULL;--> statement-breakpoint

-- Make baby_access primary key columns explicitly NOT NULL
ALTER TABLE "baby_access" ALTER COLUMN "baby_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "baby_access" ALTER COLUMN "user_id" SET NOT NULL;
