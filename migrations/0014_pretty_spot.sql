ALTER TABLE "nappy_log" ALTER COLUMN "colour" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."nappy_colour_enum";--> statement-breakpoint
CREATE TYPE "public"."nappy_colour_enum" AS ENUM('green', 'yellow', 'brown', 'black', 'red', 'grey');--> statement-breakpoint
ALTER TABLE "nappy_log" ALTER COLUMN "colour" SET DATA TYPE "public"."nappy_colour_enum" USING "colour"::"public"."nappy_colour_enum";