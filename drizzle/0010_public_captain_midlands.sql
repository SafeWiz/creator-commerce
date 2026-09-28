CREATE TABLE "ai_generations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ai_generations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"owner_id" text NOT NULL,
	"model" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_uploads" ADD COLUMN "mime_type" varchar(255);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "mime_type" varchar(255);--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_generations_ownerId_createdAt_idx" ON "ai_generations" USING btree ("owner_id","created_at");