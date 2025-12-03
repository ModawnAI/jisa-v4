CREATE TYPE "public"."chunking_strategy" AS ENUM('auto', 'row_per_chunk', 'fixed_size', 'semantic');--> statement-breakpoint
CREATE TYPE "public"."clearance_level" AS ENUM('basic', 'standard', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'partial');--> statement-breakpoint
CREATE TYPE "public"."file_type" AS ENUM('excel', 'csv', 'pdf', 'word');--> statement-breakpoint
CREATE TYPE "public"."namespace_type" AS ENUM('company', 'employee');--> statement-breakpoint
CREATE TYPE "public"."processing_mode" AS ENUM('company', 'employee_split', 'employee_aggregate');--> statement-breakpoint
CREATE TYPE "public"."processing_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'rolled_back');--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"department" text,
	"position" text,
	"manager_id" uuid,
	"clearance_level" "clearance_level" DEFAULT 'basic' NOT NULL,
	"kakao_id" text,
	"supabase_user_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"hire_date" timestamp,
	"termination_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" uuid,
	CONSTRAINT "employees_employee_id_unique" UNIQUE("employee_id"),
	CONSTRAINT "employees_kakao_id_unique" UNIQUE("kakao_id"),
	CONSTRAINT "employees_supabase_user_id_unique" UNIQUE("supabase_user_id")
);
--> statement-breakpoint
CREATE TABLE "document_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"icon" text,
	"parent_id" uuid,
	"depth" integer DEFAULT 0 NOT NULL,
	"path" text NOT NULL,
	"min_clearance_level" "clearance_level" DEFAULT 'basic' NOT NULL,
	"namespace_type" "namespace_type" DEFAULT 'company' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"color" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "document_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "document_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"metadata_schema" text,
	"default_template_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"category_id" uuid NOT NULL,
	"document_type_id" uuid,
	"file_type" "file_type" NOT NULL,
	"processing_mode" "processing_mode" DEFAULT 'company' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_latest" boolean DEFAULT true NOT NULL,
	"previous_version_id" uuid,
	"chunking_strategy" "chunking_strategy" DEFAULT 'auto' NOT NULL,
	"chunk_size" integer,
	"chunk_overlap" integer,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurring_period" text,
	"retention_days" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "document_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "template_column_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"source_column" text NOT NULL,
	"source_column_index" integer,
	"target_field" text NOT NULL,
	"target_field_type" text NOT NULL,
	"field_role" text DEFAULT 'metadata' NOT NULL,
	"transform_function" text,
	"default_value" text,
	"is_required" boolean DEFAULT false NOT NULL,
	"validation_regex" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"config_snapshot" jsonb NOT NULL,
	"column_mappings_snapshot" jsonb NOT NULL,
	"change_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_path" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_hash" text,
	"category_id" uuid,
	"document_type_id" uuid,
	"template_id" uuid,
	"period" text,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp,
	"error_message" text,
	"metadata" jsonb,
	"employee_id" uuid,
	"uploaded_by" uuid NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"total_chunks" integer NOT NULL,
	"content" text NOT NULL,
	"content_hash" text NOT NULL,
	"embedding_model" text DEFAULT 'text-embedding-3-large',
	"pinecone_id" text NOT NULL,
	"pinecone_namespace" text NOT NULL,
	"employee_id" text,
	"category_slug" text,
	"period" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_chunks_pinecone_id_unique" UNIQUE("pinecone_id")
);
--> statement-breakpoint
CREATE TABLE "data_lineage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_document_id" uuid NOT NULL,
	"source_file_url" text NOT NULL,
	"source_file_hash" text NOT NULL,
	"processing_batch_id" uuid NOT NULL,
	"template_id" uuid,
	"template_version" integer,
	"target_pinecone_id" text NOT NULL,
	"target_namespace" text NOT NULL,
	"target_employee_id" text,
	"transformation_log" jsonb,
	"chunk_index" integer,
	"original_row_range" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processing_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_number" serial NOT NULL,
	"document_id" uuid NOT NULL,
	"template_id" uuid,
	"template_version" integer,
	"period" text,
	"status" "processing_status" DEFAULT 'pending' NOT NULL,
	"total_records" integer,
	"success_count" integer,
	"error_count" integer,
	"vector_ids" jsonb,
	"is_rolled_back" boolean DEFAULT false NOT NULL,
	"rolled_back_at" timestamp,
	"rolled_back_by" uuid,
	"rollback_reason" text,
	"inngest_run_id" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"source_chunk_ids" jsonb,
	"rag_context" jsonb,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"title" text,
	"summary" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_employees_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_parent_id_document_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."document_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_created_by_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_category_id_document_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."document_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_category_id_document_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."document_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_document_type_id_document_types_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_created_by_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_column_mappings" ADD CONSTRAINT "template_column_mappings_template_id_document_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."document_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_template_id_document_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."document_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_created_by_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_category_id_document_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."document_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_document_type_id_document_types_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_template_id_document_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."document_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_employees_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_deleted_by_employees_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_lineage" ADD CONSTRAINT "data_lineage_source_document_id_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_lineage" ADD CONSTRAINT "data_lineage_processing_batch_id_processing_batches_id_fk" FOREIGN KEY ("processing_batch_id") REFERENCES "public"."processing_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_lineage" ADD CONSTRAINT "data_lineage_template_id_document_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."document_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_batches" ADD CONSTRAINT "processing_batches_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_batches" ADD CONSTRAINT "processing_batches_template_id_document_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."document_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_batches" ADD CONSTRAINT "processing_batches_rolled_back_by_employees_id_fk" FOREIGN KEY ("rolled_back_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_employee_id" ON "employees" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_kakao_id" ON "employees" USING btree ("kakao_id");--> statement-breakpoint
CREATE INDEX "idx_department" ON "employees" USING btree ("department");--> statement-breakpoint
CREATE INDEX "idx_is_active" ON "employees" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_category_path" ON "document_categories" USING btree ("path");--> statement-breakpoint
CREATE INDEX "idx_category_parent" ON "document_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_category_slug" ON "document_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_template_slug" ON "document_templates" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_template_category" ON "document_templates" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_document_category" ON "documents" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_document_template" ON "documents" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_document_period" ON "documents" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_document_status" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_document_employee" ON "documents" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_chunk_document" ON "knowledge_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_chunk_pinecone" ON "knowledge_chunks" USING btree ("pinecone_id");--> statement-breakpoint
CREATE INDEX "idx_chunk_namespace" ON "knowledge_chunks" USING btree ("pinecone_namespace");--> statement-breakpoint
CREATE INDEX "idx_chunk_employee" ON "knowledge_chunks" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_lineage_source" ON "data_lineage" USING btree ("source_document_id");--> statement-breakpoint
CREATE INDEX "idx_lineage_target" ON "data_lineage" USING btree ("target_pinecone_id");--> statement-breakpoint
CREATE INDEX "idx_lineage_employee" ON "data_lineage" USING btree ("target_employee_id");--> statement-breakpoint
CREATE INDEX "idx_batch_document" ON "processing_batches" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_batch_period" ON "processing_batches" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_batch_status" ON "processing_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_message_session" ON "chat_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_session_employee" ON "chat_sessions" USING btree ("employee_id");