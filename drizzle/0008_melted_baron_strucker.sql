CREATE TABLE "product_image_uploads" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_image_uploads_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"owner_id" text NOT NULL,
	"key" varchar(255) NOT NULL,
	"url" varchar(512) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_image_uploads" ADD CONSTRAINT "product_image_uploads_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_image_uploads_key_unq" ON "product_image_uploads" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "product_image_uploads_url_unq" ON "product_image_uploads" USING btree ("url");--> statement-breakpoint
CREATE INDEX "product_image_uploads_createdAt_idx" ON "product_image_uploads" USING btree ("created_at");