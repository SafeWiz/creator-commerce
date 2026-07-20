ALTER TABLE "user" ADD COLUMN "handle" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_handle_key" UNIQUE("handle");