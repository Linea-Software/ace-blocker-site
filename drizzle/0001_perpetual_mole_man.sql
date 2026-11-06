CREATE TABLE "desktop_release_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"installer_id" text NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"result" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ace_blocker_installer" ADD COLUMN "update_channel" text;--> statement-breakpoint
ALTER TABLE "ace_blocker_installer" ADD COLUMN "update_state" text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "ace_blocker_installer" ADD COLUMN "signed_envelope" text;--> statement-breakpoint
ALTER TABLE "ace_blocker_installer" ADD COLUMN "manifest_key_id" text;--> statement-breakpoint
ALTER TABLE "ace_blocker_installer" ADD COLUMN "staging_key" text;--> statement-breakpoint
ALTER TABLE "ace_blocker_installer" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "desktop_release_target_version_unique" ON "ace_blocker_installer" USING btree ("version","os","architecture","update_channel") WHERE "ace_blocker_installer"."update_state" <> 'legacy';--> statement-breakpoint
CREATE UNIQUE INDEX "desktop_release_single_publisher_unique" ON "ace_blocker_installer" USING btree ("os","architecture","update_channel") WHERE "ace_blocker_installer"."update_state" = 'publishing';--> statement-breakpoint
CREATE INDEX "desktop_release_feed_idx" ON "ace_blocker_installer" USING btree ("update_state","os","architecture","update_channel");--> statement-breakpoint
ALTER TABLE "ace_blocker_installer" ADD CONSTRAINT "desktop_release_signature_required" CHECK ("ace_blocker_installer"."update_state" = 'legacy' OR
		("ace_blocker_installer"."update_channel" = 'stable' AND "ace_blocker_installer"."signed_envelope" IS NOT NULL AND
		"ace_blocker_installer"."manifest_key_id" IS NOT NULL AND "ace_blocker_installer"."staging_key" IS NOT NULL));