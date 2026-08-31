CREATE TABLE "dodo_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_key" text NOT NULL,
	"type" text NOT NULL,
	"subscription_id" text,
	"event_timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dodo_webhook_events_event_key_unique" UNIQUE("event_key")
);
--> statement-breakpoint
CREATE INDEX "dodo_webhook_events_subscription_idx" ON "dodo_webhook_events" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "dodo_webhook_events_event_timestamp_idx" ON "dodo_webhook_events" USING btree ("event_timestamp");