ALTER TABLE "products" RENAME COLUMN "price" TO "price_in_cents";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "owner_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "slug" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "status" varchar(16) DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "price_in_cents" SET DATA TYPE integer USING "price_in_cents"::integer;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "currency" SET DATA TYPE varchar(3) USING "currency"::varchar(3);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
CREATE INDEX "products_ownerId_idx" ON "products" ("owner_id");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_owner_id_user_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE;