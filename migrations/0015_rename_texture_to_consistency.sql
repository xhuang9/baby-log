-- Migration: Rename texture to consistency in nappy_log table
-- This migration:
-- 1. Creates a new enum nappy_consistency_enum with new values
-- 2. Adds a new consistency column
-- 3. Migrates data from texture to consistency with value mapping
-- 4. Drops the old texture column and enum

-- Step 1: Create the new enum
CREATE TYPE "nappy_consistency_enum" AS ENUM ('watery', 'runny', 'mushy', 'pasty', 'formed', 'hardPellets');

-- Step 2: Add the new column
ALTER TABLE "nappy_log" ADD COLUMN "consistency" "nappy_consistency_enum";

-- Step 3: Migrate data from texture to consistency
UPDATE "nappy_log" SET "consistency" =
  CASE
    WHEN "texture" = 'veryRunny' THEN 'watery'::"nappy_consistency_enum"
    WHEN "texture" = 'runny' THEN 'runny'::"nappy_consistency_enum"
    WHEN "texture" = 'mushy' THEN 'mushy'::"nappy_consistency_enum"
    WHEN "texture" = 'mucusy' THEN 'pasty'::"nappy_consistency_enum"
    WHEN "texture" = 'solid' THEN 'formed'::"nappy_consistency_enum"
    WHEN "texture" = 'littleBalls' THEN 'hardPellets'::"nappy_consistency_enum"
    ELSE NULL
  END
WHERE "texture" IS NOT NULL;

-- Step 4: Drop the old texture column
ALTER TABLE "nappy_log" DROP COLUMN "texture";

-- Step 5: Drop the old enum type
DROP TYPE "nappy_texture_enum";
