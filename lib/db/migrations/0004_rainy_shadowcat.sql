CREATE TABLE "clarification_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"employee_id" uuid,
	"original_query" text NOT NULL,
	"original_confidence" real,
	"clarification_type" text NOT NULL,
	"question_asked" text NOT NULL,
	"user_response" text,
	"resolved" boolean DEFAULT false,
	"resolved_at" timestamp with time zone,
	"final_confidence" real,
	"partial_intent" jsonb,
	"merged_intent" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rag_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text,
	"employee_id" uuid,
	"query" text NOT NULL,
	"normalized_query" text,
	"route" text NOT NULL,
	"route_confidence" real,
	"route_reason" text,
	"intent_type" text,
	"intent_confidence" real,
	"template_type" text,
	"calculation_type" text,
	"router_time_ms" integer,
	"intent_time_ms" integer,
	"embedding_time_ms" integer,
	"search_time_ms" integer,
	"calculation_time_ms" integer,
	"generation_time_ms" integer,
	"total_time_ms" integer,
	"namespaces_searched" jsonb,
	"results_count" integer,
	"top_result_score" real,
	"avg_result_score" real,
	"clarification_asked" boolean DEFAULT false,
	"clarification_type" text,
	"clarification_resolved" boolean,
	"successful" boolean DEFAULT true NOT NULL,
	"error_code" text,
	"error_message" text,
	"response_length" integer,
	"tokens_used" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schema_discovery_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"namespaces" jsonb NOT NULL,
	"triggered_by" text NOT NULL,
	"schemas_discovered" integer,
	"total_vectors" integer,
	"discovery_time_ms" integer,
	"schema_details" jsonb,
	"successful" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clarification_sessions" ADD CONSTRAINT "clarification_sessions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_metrics" ADD CONSTRAINT "rag_metrics_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_clarification_session" ON "clarification_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_clarification_employee" ON "clarification_sessions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_clarification_resolved" ON "clarification_sessions" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "idx_clarification_created" ON "clarification_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_rag_metrics_session" ON "rag_metrics" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_rag_metrics_employee" ON "rag_metrics" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_rag_metrics_route" ON "rag_metrics" USING btree ("route");--> statement-breakpoint
CREATE INDEX "idx_rag_metrics_intent" ON "rag_metrics" USING btree ("intent_type");--> statement-breakpoint
CREATE INDEX "idx_rag_metrics_created" ON "rag_metrics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_rag_metrics_successful" ON "rag_metrics" USING btree ("successful");--> statement-breakpoint
CREATE INDEX "idx_schema_discovery_created" ON "schema_discovery_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_schema_discovery_triggered" ON "schema_discovery_logs" USING btree ("triggered_by");