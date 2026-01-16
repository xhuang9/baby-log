-- Migrate existing UI config data from user table to user_ui_config table
-- This migration moves useMetric, colorTheme, and handPreference to the JSONB data field

-- Step 1: Ensure all users have a row in user_ui_config (create if missing)
INSERT INTO "user_ui_config" ("user_id", "data", "key_updated_at", "schema_version", "updated_at")
SELECT
  u.id,
  '{}'::jsonb,
  '{}'::jsonb,
  1,
  NOW()
FROM "user" u
WHERE NOT EXISTS (
  SELECT 1 FROM "user_ui_config" uic WHERE uic.user_id = u.id
);
--> statement-breakpoint

-- Step 2: Migrate useMetric to data.useMetric
UPDATE "user_ui_config" uic
SET
  "data" = jsonb_set(
    COALESCE(uic.data, '{}'::jsonb),
    '{useMetric}',
    to_jsonb(u.use_metric),
    true
  ),
  "key_updated_at" = jsonb_set(
    COALESCE(uic.key_updated_at, '{}'::jsonb),
    '{useMetric}',
    to_jsonb(NOW()::text),
    true
  ),
  "updated_at" = NOW()
FROM "user" u
WHERE uic.user_id = u.id AND u.use_metric IS NOT NULL;
--> statement-breakpoint

-- Step 3: Migrate colorTheme to data.theme
UPDATE "user_ui_config" uic
SET
  "data" = jsonb_set(
    COALESCE(uic.data, '{}'::jsonb),
    '{theme}',
    to_jsonb(u.color_theme),
    true
  ),
  "key_updated_at" = jsonb_set(
    COALESCE(uic.key_updated_at, '{}'::jsonb),
    '{theme}',
    to_jsonb(NOW()::text),
    true
  ),
  "updated_at" = NOW()
FROM "user" u
WHERE uic.user_id = u.id AND u.color_theme IS NOT NULL;
--> statement-breakpoint

-- Step 4: Migrate handPreference to data.handMode (map 'left'/'right' to handMode, ignore 'both'/'unknown')
UPDATE "user_ui_config" uic
SET
  "data" = jsonb_set(
    COALESCE(uic.data, '{}'::jsonb),
    '{handMode}',
    to_jsonb(
      CASE
        WHEN u.hand_preference = 'left' THEN 'left'::text
        WHEN u.hand_preference = 'right' THEN 'right'::text
        ELSE 'right'::text -- default to right for 'both', 'unknown', or null
      END
    ),
    true
  ),
  "key_updated_at" = jsonb_set(
    COALESCE(uic.key_updated_at, '{}'::jsonb),
    '{handMode}',
    to_jsonb(NOW()::text),
    true
  ),
  "updated_at" = NOW()
FROM "user" u
WHERE uic.user_id = u.id;
--> statement-breakpoint

-- Step 5: Now safe to drop the columns from user table
ALTER TABLE "user" DROP COLUMN "use_metric";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "color_theme";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "hand_preference";--> statement-breakpoint
DROP TYPE "public"."hand_preference_enum";