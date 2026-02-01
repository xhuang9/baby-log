-- Idempotent migration: handles both fresh installs and already-migrated databases

-- Create solids_reaction_enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "public"."solids_reaction_enum" AS ENUM('allergic', 'hate', 'liked', 'loved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Handle nappy_texture_enum -> nappy_consistency_enum rename
-- Only rename if texture_enum exists and consistency_enum doesn't
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nappy_texture_enum') THEN
        ALTER TYPE "public"."nappy_texture_enum" RENAME TO "nappy_consistency_enum_old";
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Create solids_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS "solids_log" (
	"id" text PRIMARY KEY NOT NULL,
	"baby_id" integer NOT NULL,
	"logged_by_user_id" integer NOT NULL,
	"food" text NOT NULL,
	"reaction" "solids_reaction_enum" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);--> statement-breakpoint

-- Rename texture to consistency if texture column exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nappy_log' AND column_name = 'texture') THEN
        ALTER TABLE "nappy_log" RENAME COLUMN "texture" TO "consistency";
    END IF;
END $$;--> statement-breakpoint

-- Create nappy_consistency_enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "public"."nappy_consistency_enum" AS ENUM('watery', 'runny', 'mushy', 'pasty', 'formed', 'hardPellets');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Set consistency column to use the enum type (only if column exists and isn't already the correct type)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nappy_log' AND column_name = 'consistency') THEN
        ALTER TABLE "nappy_log" ALTER COLUMN "consistency" SET DATA TYPE "public"."nappy_consistency_enum" USING "consistency"::"public"."nappy_consistency_enum";
    END IF;
EXCEPTION
    WHEN others THEN null; -- Already the correct type
END $$;--> statement-breakpoint

-- Drop old enum if it exists
DROP TYPE IF EXISTS "public"."nappy_consistency_enum_old";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."nappy_texture_enum";--> statement-breakpoint

-- Add foreign keys if they don't exist
DO $$ BEGIN
    ALTER TABLE "solids_log" ADD CONSTRAINT "solids_log_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "solids_log" ADD CONSTRAINT "solids_log_logged_by_user_id_user_id_fk" FOREIGN KEY ("logged_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS "solids_log_baby_started_at_idx" ON "solids_log" USING btree ("baby_id","started_at");