-- Create food_types table for user-created food types
CREATE TABLE "food_types" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);

-- Create indexes for efficient queries
CREATE INDEX "food_types_user_id_idx" ON "food_types" ("user_id");

-- Ensure unique food names per user (case-insensitive)
CREATE UNIQUE INDEX "food_types_user_id_name_unique" ON "food_types" ("user_id", LOWER("name"));

-- Add food_type_ids column to solids_log table
ALTER TABLE "solids_log" ADD COLUMN "food_type_ids" text[] DEFAULT '{}';
