CREATE TYPE "public"."nappy_colour_enum" AS ENUM('green', 'yellow', 'brown', 'darkGrey', 'red', 'grey');--> statement-breakpoint
CREATE TYPE "public"."nappy_texture_enum" AS ENUM('veryRunny', 'runny', 'mushy', 'mucusy', 'solid', 'littleBalls');--> statement-breakpoint
ALTER TYPE "public"."nappy_type_enum" ADD VALUE 'clean';--> statement-breakpoint
ALTER TABLE "nappy_log" ADD COLUMN "colour" "nappy_colour_enum";--> statement-breakpoint
ALTER TABLE "nappy_log" ADD COLUMN "texture" "nappy_texture_enum";