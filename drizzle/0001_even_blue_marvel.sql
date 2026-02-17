CREATE TABLE "pc_trials" (
	"id" serial PRIMARY KEY NOT NULL,
	"pc_identifier" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pc_trials_pc_identifier_unique" UNIQUE("pc_identifier")
);
