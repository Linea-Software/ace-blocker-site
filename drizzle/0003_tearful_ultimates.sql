CREATE TABLE "device_links" (
	"device_code_hash" text PRIMARY KEY NOT NULL,
	"user_code_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_polled_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "device_links_user_code_hash_unique" UNIQUE("user_code_hash")
);
--> statement-breakpoint
ALTER TABLE "device_links" ADD CONSTRAINT "device_links_approved_user_id_user_id_fk" FOREIGN KEY ("approved_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "device_links_expiry_idx" ON "device_links" USING btree ("expires_at");