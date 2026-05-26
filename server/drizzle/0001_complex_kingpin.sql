ALTER TABLE "dex_contexts" ALTER COLUMN "state" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "dex_contexts" ALTER COLUMN "state" SET DEFAULT 'created';--> statement-breakpoint
ALTER TABLE "decision_records" ADD COLUMN "actor_type" text DEFAULT 'human' NOT NULL;--> statement-breakpoint
ALTER TABLE "decision_records" ADD COLUMN "context" jsonb;--> statement-breakpoint
ALTER TABLE "decision_records" ADD COLUMN "constraints" jsonb;--> statement-breakpoint
ALTER TABLE "decision_records" ADD COLUMN "alternatives" jsonb;--> statement-breakpoint
ALTER TABLE "decision_records" ADD COLUMN "confidence_score" numeric;--> statement-breakpoint
ALTER TABLE "decision_records" ADD COLUMN "model_version" text;--> statement-breakpoint
ALTER TABLE "decision_records" ADD COLUMN "outcome" jsonb;--> statement-breakpoint
ALTER TABLE "dex_contexts" ADD COLUMN "flow_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "dex_contexts" ADD COLUMN "entity_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "dex_contexts" ADD COLUMN "entity_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "dex_contexts" ADD COLUMN "active_actors" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "dex_contexts" ADD COLUMN "execution_trace" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "dex_contexts" ADD COLUMN "governance_hooks" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "dex_contexts" ADD COLUMN "checkpoints" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "dex_contexts" ADD COLUMN "metadata" jsonb DEFAULT '{}' NOT NULL;