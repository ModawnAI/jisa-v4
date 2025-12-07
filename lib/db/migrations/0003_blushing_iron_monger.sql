ALTER TYPE "public"."namespace_type" ADD VALUE 'public';--> statement-breakpoint
CREATE TABLE "employee_allowances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"document_id" uuid,
	"period" text NOT NULL,
	"allowance_type" text NOT NULL,
	"allowance_name" text,
	"allowance_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"description" text,
	"raw_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_clawbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"document_id" uuid,
	"period" text NOT NULL,
	"insurance_company" text,
	"policy_number" text,
	"contractor_name" text,
	"clawback_type" text,
	"clawback_reason" text,
	"clawback_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"original_payment_date" date,
	"raw_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"document_id" uuid,
	"period" text NOT NULL,
	"insurance_company" text,
	"policy_number" text,
	"contractor_name" text,
	"product_name" text,
	"contract_date" date,
	"payment_date" date,
	"commission_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"commission_rate" numeric(5, 4),
	"premium_amount" numeric(15, 2),
	"raw_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_incentives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"document_id" uuid,
	"period" text NOT NULL,
	"insurance_company" text,
	"policy_number" text,
	"contractor_name" text,
	"product_name" text,
	"incentive_type" text,
	"incentive_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"raw_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"document_id" uuid,
	"period" text NOT NULL,
	"insurance_company" text,
	"agent_id" text,
	"agent_name" text,
	"policy_number" text,
	"contractor_name" text,
	"override_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"override_rate" numeric(5, 4),
	"raw_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_performance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"document_id" uuid,
	"period" text NOT NULL,
	"insurance_company" text,
	"performance_type" text,
	"metric_name" text,
	"metric_value" numeric(15, 2),
	"target_value" numeric(15, 2),
	"achievement_rate" numeric(10, 4),
	"raw_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metadata_discovery_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"namespace" text NOT NULL,
	"discovered_fields" jsonb NOT NULL,
	"sample_size" integer NOT NULL,
	"unique_values_per_field" jsonb,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "query_intent_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_query" text NOT NULL,
	"parsed_intent" jsonb NOT NULL,
	"template_used" text,
	"filters_applied" jsonb,
	"calculation_performed" text,
	"successful" boolean DEFAULT true NOT NULL,
	"results_count" integer,
	"response_time_ms" integer,
	"user_feedback" text,
	"feedback_details" text,
	"corrected_intent" jsonb,
	"employee_id" text,
	"session_id" text,
	"confidence" real,
	"was_ambiguous" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rag_template_schemas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid,
	"template_slug" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"metadata_fields" jsonb NOT NULL,
	"chunk_types" jsonb NOT NULL,
	"supported_intents" jsonb NOT NULL,
	"calculations" jsonb,
	"example_queries" jsonb,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_name" text DEFAULT '지사앱 AI' NOT NULL,
	"agent_emoji" text DEFAULT '🤖',
	"welcome_message" text DEFAULT '안녕하세요! 👋
지사앱 AI입니다.

무엇을 도와드릴까요?

💡 "/" 로 시작하면
  개인 데이터 조회가
  가능합니다.' NOT NULL,
	"signature" text DEFAULT '',
	"signature_enabled" boolean DEFAULT false NOT NULL,
	"header_template" text DEFAULT '',
	"header_enabled" boolean DEFAULT false NOT NULL,
	"max_line_width" integer DEFAULT 22 NOT NULL,
	"use_emojis" boolean DEFAULT true NOT NULL,
	"use_indentation" boolean DEFAULT true NOT NULL,
	"error_generic" text DEFAULT '죄송합니다.
오류가 발생했습니다.

잠시 후 다시
시도해주세요. 🙏' NOT NULL,
	"error_not_registered" text DEFAULT '등록된 직원만
사용 가능합니다.

인증 코드로 먼저
등록해주세요. 🔐' NOT NULL,
	"error_no_results" text DEFAULT '관련 정보를
찾지 못했습니다.

다른 키워드로
검색해보세요. 🔍' NOT NULL,
	"rate_limit_message" text DEFAULT '요청이 너무 많습니다.

잠시 후 다시
시도해주세요. ⏳',
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verification_codes" ALTER COLUMN "kakao_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "document_categories" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "processing_batches" ADD COLUMN "total_batches" integer;--> statement-breakpoint
ALTER TABLE "processing_batches" ADD COLUMN "start_row_index" integer;--> statement-breakpoint
ALTER TABLE "processing_batches" ADD COLUMN "end_row_index" integer;--> statement-breakpoint
ALTER TABLE "processing_batches" ADD COLUMN "record_count" integer;--> statement-breakpoint
ALTER TABLE "processing_batches" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "verification_codes" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_codes" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_codes" ADD COLUMN "tier" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_codes" ADD COLUMN "max_uses" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_codes" ADD COLUMN "current_uses" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_codes" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "verification_codes" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "employee_allowances" ADD CONSTRAINT "employee_allowances_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_clawbacks" ADD CONSTRAINT "employee_clawbacks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_commissions" ADD CONSTRAINT "employee_commissions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_incentives" ADD CONSTRAINT "employee_incentives_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_overrides" ADD CONSTRAINT "employee_overrides_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_performance" ADD CONSTRAINT "employee_performance_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_template_schemas" ADD CONSTRAINT "rag_template_schemas_template_id_document_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."document_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_settings" ADD CONSTRAINT "chat_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_employee_allowances_employee_period" ON "employee_allowances" USING btree ("employee_id","period");--> statement-breakpoint
CREATE INDEX "idx_employee_allowances_document" ON "employee_allowances" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_employee_clawbacks_employee_period" ON "employee_clawbacks" USING btree ("employee_id","period");--> statement-breakpoint
CREATE INDEX "idx_employee_clawbacks_document" ON "employee_clawbacks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_employee_commissions_employee_period" ON "employee_commissions" USING btree ("employee_id","period");--> statement-breakpoint
CREATE INDEX "idx_employee_commissions_document" ON "employee_commissions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_employee_commissions_insurance" ON "employee_commissions" USING btree ("insurance_company");--> statement-breakpoint
CREATE INDEX "idx_employee_incentives_employee_period" ON "employee_incentives" USING btree ("employee_id","period");--> statement-breakpoint
CREATE INDEX "idx_employee_incentives_document" ON "employee_incentives" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_employee_overrides_employee_period" ON "employee_overrides" USING btree ("employee_id","period");--> statement-breakpoint
CREATE INDEX "idx_employee_overrides_document" ON "employee_overrides" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_employee_performance_employee_period" ON "employee_performance" USING btree ("employee_id","period");--> statement-breakpoint
CREATE INDEX "idx_employee_performance_document" ON "employee_performance" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_discovery_namespace" ON "metadata_discovery_cache" USING btree ("namespace");--> statement-breakpoint
CREATE INDEX "idx_discovery_expires" ON "metadata_discovery_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_intent_log_template" ON "query_intent_logs" USING btree ("template_used");--> statement-breakpoint
CREATE INDEX "idx_intent_log_feedback" ON "query_intent_logs" USING btree ("user_feedback");--> statement-breakpoint
CREATE INDEX "idx_intent_log_success" ON "query_intent_logs" USING btree ("successful");--> statement-breakpoint
CREATE INDEX "idx_intent_log_created" ON "query_intent_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_rag_schema_template" ON "rag_template_schemas" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_rag_schema_slug" ON "rag_template_schemas" USING btree ("template_slug");--> statement-breakpoint
CREATE INDEX "idx_rag_schema_active" ON "rag_template_schemas" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_chat_settings_active" ON "chat_settings" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_verification_status" ON "verification_codes" USING btree ("status");--> statement-breakpoint
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_code_unique" UNIQUE("code");