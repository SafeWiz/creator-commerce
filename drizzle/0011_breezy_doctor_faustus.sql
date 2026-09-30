DROP INDEX "ai_generations_ownerId_createdAt_idx";--> statement-breakpoint
ALTER TABLE "ai_generations" ADD COLUMN "feature" varchar(32) DEFAULT 'describe' NOT NULL;--> statement-breakpoint
CREATE INDEX "ai_generations_ownerId_feature_createdAt_idx" ON "ai_generations" USING btree ("owner_id","feature","created_at");