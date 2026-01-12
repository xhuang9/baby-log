CREATE TYPE "public"."access_request_status_enum" AS ENUM('pending', 'approved', 'rejected', 'canceled');--> statement-breakpoint
CREATE TABLE "baby_access_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_user_id" integer NOT NULL,
	"target_email" text NOT NULL,
	"target_user_id" integer,
	"requested_access_level" "access_level_enum" DEFAULT 'viewer' NOT NULL,
	"message" text,
	"status" "access_request_status_enum" DEFAULT 'pending' NOT NULL,
	"resolved_baby_id" integer,
	"resolved_by_user_id" integer,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "baby_access_requests" ADD CONSTRAINT "baby_access_requests_requester_user_id_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_access_requests" ADD CONSTRAINT "baby_access_requests_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_access_requests" ADD CONSTRAINT "baby_access_requests_resolved_baby_id_babies_id_fk" FOREIGN KEY ("resolved_baby_id") REFERENCES "public"."babies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_access_requests" ADD CONSTRAINT "baby_access_requests_resolved_by_user_id_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "baby_access_requests_target_email_idx" ON "baby_access_requests" USING btree ("target_email");--> statement-breakpoint
CREATE INDEX "baby_access_requests_target_user_id_idx" ON "baby_access_requests" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "baby_access_requests_requester_user_id_idx" ON "baby_access_requests" USING btree ("requester_user_id");--> statement-breakpoint
CREATE INDEX "baby_access_requests_status_idx" ON "baby_access_requests" USING btree ("status");