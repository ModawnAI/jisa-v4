CREATE TYPE "public"."conflict_status" AS ENUM('detected', 'reviewing', 'resolved_keep_existing', 'resolved_keep_new', 'resolved_merged', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."conflict_type" AS ENUM('duplicate_content', 'version_mismatch', 'category_mismatch', 'metadata_conflict', 'employee_mismatch');--> statement-breakpoint
CREATE TYPE "public"."prompt_category" AS ENUM('kakao_chat', 'admin_chat', 'document_processing', 'analytics');--> statement-breakpoint
CREATE TYPE "public"."prompt_type" AS ENUM('system', 'query_enhancement', 'answer_generation', 'commission_detection', 'employee_rag', 'error_response', 'greeting', 'no_results');--> statement-breakpoint
CREATE TABLE "document_conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"new_document_id" uuid NOT NULL,
	"existing_document_id" uuid,
	"conflict_type" "conflict_type" NOT NULL,
	"status" "conflict_status" DEFAULT 'detected' NOT NULL,
	"conflict_details" jsonb,
	"resolved_by" uuid,
	"resolved_at" timestamp,
	"resolution_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kakao_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kakao_user_id" text NOT NULL,
	"display_name" text,
	"profile_image_url" text,
	"employee_id" uuid,
	"subscription_tier" text DEFAULT 'free' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"last_active_at" timestamp with time zone,
	"message_count" text DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kakao_profiles_kakao_user_id_unique" UNIQUE("kakao_user_id")
);
--> statement-breakpoint
CREATE TABLE "verification_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"kakao_user_id" text NOT NULL,
	"employee_id" uuid,
	"employee_code" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "query_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kakao_user_id" text NOT NULL,
	"kakao_profile_id" uuid,
	"employee_id" uuid,
	"session_id" text,
	"query" text NOT NULL,
	"enhanced_query" text,
	"query_type" text DEFAULT 'rag' NOT NULL,
	"response" text,
	"response_time_ms" integer,
	"tokens_used" integer,
	"results_count" integer DEFAULT 0,
	"max_relevance_score" text,
	"successful" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_template_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"variables" jsonb,
	"model_config" jsonb,
	"change_note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"type" "prompt_type" NOT NULL,
	"category" "prompt_category" DEFAULT 'kakao_chat' NOT NULL,
	"content" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"model_config" jsonb DEFAULT '{"model":"gemini-2.0-flash","temperature":0.7,"maxOutputTokens":1024}'::jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_prompt_slug_version" UNIQUE("slug","version")
);
--> statement-breakpoint
ALTER TABLE "document_categories" DROP CONSTRAINT "document_categories_created_by_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "document_templates" DROP CONSTRAINT "document_templates_created_by_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "template_versions" DROP CONSTRAINT "template_versions_created_by_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "documents" DROP CONSTRAINT "documents_uploaded_by_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "documents" DROP CONSTRAINT "documents_deleted_by_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "processing_batches" DROP CONSTRAINT "processing_batches_rolled_back_by_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "document_conflicts" ADD CONSTRAINT "document_conflicts_new_document_id_documents_id_fk" FOREIGN KEY ("new_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_conflicts" ADD CONSTRAINT "document_conflicts_existing_document_id_documents_id_fk" FOREIGN KEY ("existing_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_conflicts" ADD CONSTRAINT "document_conflicts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kakao_profiles" ADD CONSTRAINT "kakao_profiles_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "query_logs" ADD CONSTRAINT "query_logs_kakao_profile_id_kakao_profiles_id_fk" FOREIGN KEY ("kakao_profile_id") REFERENCES "public"."kakao_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "query_logs" ADD CONSTRAINT "query_logs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_template_versions" ADD CONSTRAINT "prompt_template_versions_template_id_prompt_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."prompt_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_template_versions" ADD CONSTRAINT "prompt_template_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_templates" ADD CONSTRAINT "prompt_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_templates" ADD CONSTRAINT "prompt_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_conflict_new_doc" ON "document_conflicts" USING btree ("new_document_id");--> statement-breakpoint
CREATE INDEX "idx_conflict_existing_doc" ON "document_conflicts" USING btree ("existing_document_id");--> statement-breakpoint
CREATE INDEX "idx_conflict_status" ON "document_conflicts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_kakao_user_id" ON "kakao_profiles" USING btree ("kakao_user_id");--> statement-breakpoint
CREATE INDEX "idx_kakao_employee_id" ON "kakao_profiles" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_kakao_verified" ON "kakao_profiles" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "idx_verification_code" ON "verification_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_verification_kakao" ON "verification_codes" USING btree ("kakao_user_id");--> statement-breakpoint
CREATE INDEX "idx_verification_employee" ON "verification_codes" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_verification_expires" ON "verification_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_query_log_kakao" ON "query_logs" USING btree ("kakao_user_id");--> statement-breakpoint
CREATE INDEX "idx_query_log_employee" ON "query_logs" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_query_log_type" ON "query_logs" USING btree ("query_type");--> statement-breakpoint
CREATE INDEX "idx_query_log_successful" ON "query_logs" USING btree ("successful");--> statement-breakpoint
CREATE INDEX "idx_query_log_created" ON "query_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_version_template" ON "prompt_template_versions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_version_number" ON "prompt_template_versions" USING btree ("version");--> statement-breakpoint
CREATE INDEX "idx_prompt_type" ON "prompt_templates" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_prompt_category" ON "prompt_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_prompt_active" ON "prompt_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_prompt_default" ON "prompt_templates" USING btree ("is_default");--> statement-breakpoint
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_batches" ADD CONSTRAINT "processing_batches_rolled_back_by_users_id_fk" FOREIGN KEY ("rolled_back_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;