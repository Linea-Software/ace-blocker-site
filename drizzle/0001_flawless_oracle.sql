CREATE TYPE "public"."architecture" AS ENUM('x64', 'arm64');--> statement-breakpoint
CREATE TYPE "public"."os" AS ENUM('windows', 'linux', 'macos');--> statement-breakpoint
CREATE TABLE "ace_blocker_installer" (
	"id" text PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"version" text NOT NULL,
	"os" "os" NOT NULL,
	"architecture" "architecture" NOT NULL,
	"download_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sha256" text NOT NULL,
	"size" integer NOT NULL,
	"can_be_downloaded" boolean DEFAULT true NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resistance_mode_scripts" (
	"id" text PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"version" text NOT NULL,
	"download_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sha256" text NOT NULL,
	"size" integer NOT NULL,
	"can_be_downloaded" boolean DEFAULT true NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_list" (
	"id" text PRIMARY KEY NOT NULL,
	"site_list_id" uuid NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"file_name" text NOT NULL,
	"requires_pro_subscription" boolean DEFAULT true NOT NULL,
	"download_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"sha256" text NOT NULL,
	"size" integer NOT NULL,
	"can_be_downloaded" boolean DEFAULT true NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracking_scripts" (
	"id" text PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"version" text NOT NULL,
	"download_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sha256" text NOT NULL,
	"size" integer NOT NULL,
	"can_be_downloaded" boolean DEFAULT true NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apikey" ALTER COLUMN "rate_limit_max" SET DEFAULT 100;