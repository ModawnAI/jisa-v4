-- Create conflict-related enums
CREATE TYPE "public"."conflict_status" AS ENUM('detected', 'reviewing', 'resolved_keep_existing', 'resolved_keep_new', 'resolved_merged', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."conflict_type" AS ENUM('duplicate_content', 'version_mismatch', 'category_mismatch', 'metadata_conflict', 'employee_mismatch');--> statement-breakpoint

-- Create document_conflicts table
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
);--> statement-breakpoint

-- Add foreign keys
ALTER TABLE "document_conflicts" ADD CONSTRAINT "document_conflicts_new_document_id_documents_id_fk" FOREIGN KEY ("new_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_conflicts" ADD CONSTRAINT "document_conflicts_existing_document_id_documents_id_fk" FOREIGN KEY ("existing_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_conflicts" ADD CONSTRAINT "document_conflicts_resolved_by_employees_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Create indexes
CREATE INDEX "idx_conflict_new_doc" ON "document_conflicts" USING btree ("new_document_id");--> statement-breakpoint
CREATE INDEX "idx_conflict_existing_doc" ON "document_conflicts" USING btree ("existing_document_id");--> statement-breakpoint
CREATE INDEX "idx_conflict_status" ON "document_conflicts" USING btree ("status");
