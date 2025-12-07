CREATE TYPE "public"."discrepancy_severity" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."discrepancy_type" AS ENUM('missing', 'wrong_value', 'format_mismatch', 'type_mismatch', 'within_tolerance');--> statement-breakpoint
CREATE TYPE "public"."optimization_action_type" AS ENUM('schema_update', 'embedding_update', 'filter_fix', 'metadata_add', 'field_alias', 'query_pattern');--> statement-breakpoint
CREATE TYPE "public"."test_status" AS ENUM('pending', 'running', 'passed', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "accuracy_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"pipeline_run_id" uuid,
	"iteration" integer DEFAULT 0,
	"status" "test_status" NOT NULL,
	"passed" boolean NOT NULL,
	"accuracy" real NOT NULL,
	"response" text,
	"extracted_values" jsonb,
	"discrepancies" jsonb,
	"discrepancy_count" integer DEFAULT 0,
	"search_results_count" integer,
	"top_score" real,
	"filters_used" jsonb,
	"namespace_searched" text,
	"processing_time_ms" integer,
	"router_time_ms" integer,
	"search_time_ms" integer,
	"generation_time_ms" integer,
	"route_type" text,
	"intent_type" text,
	"intent_confidence" real,
	"tested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accuracy_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schema_id" uuid,
	"test_suite_id" text,
	"category" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"query" text NOT NULL,
	"query_pattern" text,
	"target_entity" jsonb NOT NULL,
	"expected_fields" jsonb NOT NULL,
	"expected_values" jsonb NOT NULL,
	"value_tolerance" real DEFAULT 0.02,
	"allowed_discrepancies" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"generated_from" text,
	"ground_truth_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "embedding_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schema_id" uuid,
	"schema_slug" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"sections" jsonb NOT NULL,
	"semantic_anchors" jsonb DEFAULT '[]'::jsonb,
	"max_length" integer DEFAULT 8000 NOT NULL,
	"priority_fields" jsonb DEFAULT '[]'::jsonb,
	"avg_relevance_score" real,
	"query_success_rate" real,
	"total_queries" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ground_truth" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schema_id" uuid,
	"document_id" uuid,
	"entity_identifier" jsonb NOT NULL,
	"field_values" jsonb NOT NULL,
	"extracted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"extraction_method" text DEFAULT 'auto' NOT NULL,
	"is_valid" boolean DEFAULT true NOT NULL,
	"invalidated_reason" text,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "optimization_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schema_id" uuid,
	"pipeline_run_id" uuid,
	"iteration" integer,
	"action_type" "optimization_action_type" NOT NULL,
	"target" text NOT NULL,
	"target_id" uuid,
	"change" jsonb NOT NULL,
	"reason" text NOT NULL,
	"confidence" real NOT NULL,
	"failure_patterns" jsonb,
	"affected_tests" jsonb,
	"applied" boolean DEFAULT false NOT NULL,
	"success" boolean,
	"error" text,
	"accuracy_before" real,
	"accuracy_after" real,
	"improvement_percent" real,
	"can_rollback" boolean DEFAULT true,
	"rolled_back" boolean DEFAULT false,
	"previous_state" jsonb,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid,
	"schema_id" uuid,
	"trigger_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"current_phase" text,
	"target_accuracy" real DEFAULT 0.95,
	"max_iterations" integer DEFAULT 5,
	"final_accuracy" real,
	"total_iterations" integer DEFAULT 0,
	"accuracy_history" jsonb DEFAULT '[]'::jsonb,
	"tests_run" integer DEFAULT 0,
	"tests_passed" integer DEFAULT 0,
	"optimizations_applied" integer DEFAULT 0,
	"error_message" text,
	"error_stack" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"total_duration_ms" integer
);
--> statement-breakpoint
ALTER TABLE "accuracy_results" ADD CONSTRAINT "accuracy_results_test_id_accuracy_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."accuracy_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accuracy_tests" ADD CONSTRAINT "accuracy_tests_schema_id_rag_template_schemas_id_fk" FOREIGN KEY ("schema_id") REFERENCES "public"."rag_template_schemas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accuracy_tests" ADD CONSTRAINT "accuracy_tests_ground_truth_id_ground_truth_id_fk" FOREIGN KEY ("ground_truth_id") REFERENCES "public"."ground_truth"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embedding_templates" ADD CONSTRAINT "embedding_templates_schema_id_rag_template_schemas_id_fk" FOREIGN KEY ("schema_id") REFERENCES "public"."rag_template_schemas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ground_truth" ADD CONSTRAINT "ground_truth_schema_id_rag_template_schemas_id_fk" FOREIGN KEY ("schema_id") REFERENCES "public"."rag_template_schemas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ground_truth" ADD CONSTRAINT "ground_truth_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optimization_actions" ADD CONSTRAINT "optimization_actions_schema_id_rag_template_schemas_id_fk" FOREIGN KEY ("schema_id") REFERENCES "public"."rag_template_schemas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_schema_id_rag_template_schemas_id_fk" FOREIGN KEY ("schema_id") REFERENCES "public"."rag_template_schemas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accuracy_result_test" ON "accuracy_results" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "idx_accuracy_result_pipeline" ON "accuracy_results" USING btree ("pipeline_run_id");--> statement-breakpoint
CREATE INDEX "idx_accuracy_result_passed" ON "accuracy_results" USING btree ("passed");--> statement-breakpoint
CREATE INDEX "idx_accuracy_result_tested" ON "accuracy_results" USING btree ("tested_at");--> statement-breakpoint
CREATE INDEX "idx_accuracy_test_schema" ON "accuracy_tests" USING btree ("schema_id");--> statement-breakpoint
CREATE INDEX "idx_accuracy_test_suite" ON "accuracy_tests" USING btree ("test_suite_id");--> statement-breakpoint
CREATE INDEX "idx_accuracy_test_category" ON "accuracy_tests" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_accuracy_test_active" ON "accuracy_tests" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_embedding_template_schema" ON "embedding_templates" USING btree ("schema_id");--> statement-breakpoint
CREATE INDEX "idx_embedding_template_slug" ON "embedding_templates" USING btree ("schema_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_embedding_template_unique" ON "embedding_templates" USING btree ("schema_slug","version");--> statement-breakpoint
CREATE INDEX "idx_ground_truth_schema" ON "ground_truth" USING btree ("schema_id");--> statement-breakpoint
CREATE INDEX "idx_ground_truth_document" ON "ground_truth" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_ground_truth_entity" ON "ground_truth" USING btree ("entity_identifier");--> statement-breakpoint
CREATE INDEX "idx_ground_truth_valid" ON "ground_truth" USING btree ("is_valid");--> statement-breakpoint
CREATE INDEX "idx_optimization_schema" ON "optimization_actions" USING btree ("schema_id");--> statement-breakpoint
CREATE INDEX "idx_optimization_pipeline" ON "optimization_actions" USING btree ("pipeline_run_id");--> statement-breakpoint
CREATE INDEX "idx_optimization_type" ON "optimization_actions" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "idx_optimization_applied" ON "optimization_actions" USING btree ("applied");--> statement-breakpoint
CREATE INDEX "idx_optimization_success" ON "optimization_actions" USING btree ("success");--> statement-breakpoint
CREATE INDEX "idx_pipeline_run_document" ON "pipeline_runs" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_pipeline_run_schema" ON "pipeline_runs" USING btree ("schema_id");--> statement-breakpoint
CREATE INDEX "idx_pipeline_run_status" ON "pipeline_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pipeline_run_started" ON "pipeline_runs" USING btree ("started_at");