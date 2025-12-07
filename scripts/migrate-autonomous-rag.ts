import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function migrate() {
  console.log('Applying autonomous RAG schema migration...');

  // Create enums (ignore if exists)
  const enums = [
    "CREATE TYPE discrepancy_severity AS ENUM ('critical', 'high', 'medium', 'low')",
    "CREATE TYPE discrepancy_type AS ENUM ('missing', 'wrong_value', 'format_mismatch', 'type_mismatch', 'within_tolerance')",
    "CREATE TYPE optimization_action_type AS ENUM ('schema_update', 'embedding_update', 'filter_fix', 'metadata_add', 'field_alias', 'query_pattern')",
    "CREATE TYPE test_status AS ENUM ('pending', 'running', 'passed', 'failed', 'skipped')",
  ];

  for (const e of enums) {
    try {
      await db.execute(sql.raw(e));
      console.log('Created enum:', e.split(' ')[2]);
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === '42710') {
        console.log('Enum already exists:', e.split(' ')[2]);
      } else {
        throw err;
      }
    }
  }

  // Create tables
  const tables = [
    `CREATE TABLE IF NOT EXISTS pipeline_runs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id uuid REFERENCES documents(id),
      schema_id uuid REFERENCES rag_template_schemas(id),
      trigger_type text NOT NULL,
      status text DEFAULT 'pending' NOT NULL,
      current_phase text,
      target_accuracy real DEFAULT 0.95,
      max_iterations integer DEFAULT 5,
      final_accuracy real,
      total_iterations integer DEFAULT 0,
      accuracy_history jsonb DEFAULT '[]',
      tests_run integer DEFAULT 0,
      tests_passed integer DEFAULT 0,
      optimizations_applied integer DEFAULT 0,
      error_message text,
      error_stack text,
      started_at timestamptz DEFAULT now() NOT NULL,
      completed_at timestamptz,
      total_duration_ms integer
    )`,
    `CREATE TABLE IF NOT EXISTS ground_truth (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      schema_id uuid REFERENCES rag_template_schemas(id) ON DELETE CASCADE,
      document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
      entity_identifier jsonb NOT NULL,
      field_values jsonb NOT NULL,
      extracted_at timestamptz DEFAULT now() NOT NULL,
      confidence real DEFAULT 1 NOT NULL,
      extraction_method text DEFAULT 'auto' NOT NULL,
      is_valid boolean DEFAULT true NOT NULL,
      invalidated_reason text,
      valid_until timestamptz,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS embedding_templates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      schema_id uuid REFERENCES rag_template_schemas(id) ON DELETE CASCADE,
      schema_slug text NOT NULL,
      version integer DEFAULT 1 NOT NULL,
      sections jsonb NOT NULL,
      semantic_anchors jsonb DEFAULT '[]',
      max_length integer DEFAULT 8000 NOT NULL,
      priority_fields jsonb DEFAULT '[]',
      avg_relevance_score real,
      query_success_rate real,
      total_queries integer DEFAULT 0,
      is_active boolean DEFAULT true NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS accuracy_tests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      schema_id uuid REFERENCES rag_template_schemas(id) ON DELETE CASCADE,
      test_suite_id text,
      category text NOT NULL,
      priority text DEFAULT 'medium' NOT NULL,
      name text NOT NULL,
      description text,
      query text NOT NULL,
      query_pattern text,
      target_entity jsonb NOT NULL,
      expected_fields jsonb NOT NULL,
      expected_values jsonb NOT NULL,
      value_tolerance real DEFAULT 0.02,
      allowed_discrepancies jsonb,
      is_active boolean DEFAULT true NOT NULL,
      generated_from text,
      ground_truth_id uuid,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS accuracy_results (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      test_id uuid NOT NULL REFERENCES accuracy_tests(id) ON DELETE CASCADE,
      pipeline_run_id uuid REFERENCES pipeline_runs(id),
      iteration integer DEFAULT 0,
      status test_status NOT NULL,
      passed boolean NOT NULL,
      accuracy real NOT NULL,
      response text,
      extracted_values jsonb,
      discrepancies jsonb,
      discrepancy_count integer DEFAULT 0,
      search_results_count integer,
      top_score real,
      filters_used jsonb,
      namespace_searched text,
      processing_time_ms integer,
      router_time_ms integer,
      search_time_ms integer,
      generation_time_ms integer,
      route_type text,
      intent_type text,
      intent_confidence real,
      tested_at timestamptz DEFAULT now() NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS optimization_actions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      schema_id uuid REFERENCES rag_template_schemas(id),
      pipeline_run_id uuid REFERENCES pipeline_runs(id),
      iteration integer,
      action_type optimization_action_type NOT NULL,
      target text NOT NULL,
      target_id uuid,
      change jsonb NOT NULL,
      reason text NOT NULL,
      confidence real NOT NULL,
      failure_patterns jsonb,
      affected_tests jsonb,
      applied boolean DEFAULT false NOT NULL,
      success boolean,
      error text,
      accuracy_before real,
      accuracy_after real,
      improvement_percent real,
      can_rollback boolean DEFAULT true,
      rolled_back boolean DEFAULT false,
      previous_state jsonb,
      applied_at timestamptz DEFAULT now() NOT NULL
    )`,
  ];

  for (const t of tables) {
    const tableName = t.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
    try {
      await db.execute(sql.raw(t));
      console.log('Created/verified table:', tableName);
    } catch (err) {
      console.error('Error creating table:', tableName, err);
    }
  }

  // Add FK for ground_truth_id after both tables exist
  try {
    await db.execute(
      sql.raw(`
      ALTER TABLE accuracy_tests
      ADD CONSTRAINT accuracy_tests_ground_truth_id_fk
      FOREIGN KEY (ground_truth_id) REFERENCES ground_truth(id)
    `)
    );
    console.log('Added FK: accuracy_tests.ground_truth_id');
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === '42710') {
      console.log('FK already exists: accuracy_tests.ground_truth_id');
    }
  }

  // Create indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_pipeline_run_document ON pipeline_runs(document_id)',
    'CREATE INDEX IF NOT EXISTS idx_pipeline_run_schema ON pipeline_runs(schema_id)',
    'CREATE INDEX IF NOT EXISTS idx_pipeline_run_status ON pipeline_runs(status)',
    'CREATE INDEX IF NOT EXISTS idx_pipeline_run_started ON pipeline_runs(started_at)',
    'CREATE INDEX IF NOT EXISTS idx_ground_truth_schema ON ground_truth(schema_id)',
    'CREATE INDEX IF NOT EXISTS idx_ground_truth_document ON ground_truth(document_id)',
    'CREATE INDEX IF NOT EXISTS idx_ground_truth_valid ON ground_truth(is_valid)',
    'CREATE INDEX IF NOT EXISTS idx_embedding_template_schema ON embedding_templates(schema_id)',
    'CREATE INDEX IF NOT EXISTS idx_embedding_template_slug ON embedding_templates(schema_slug)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_embedding_template_unique ON embedding_templates(schema_slug, version)',
    'CREATE INDEX IF NOT EXISTS idx_accuracy_test_schema ON accuracy_tests(schema_id)',
    'CREATE INDEX IF NOT EXISTS idx_accuracy_test_suite ON accuracy_tests(test_suite_id)',
    'CREATE INDEX IF NOT EXISTS idx_accuracy_test_category ON accuracy_tests(category)',
    'CREATE INDEX IF NOT EXISTS idx_accuracy_test_active ON accuracy_tests(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_accuracy_result_test ON accuracy_results(test_id)',
    'CREATE INDEX IF NOT EXISTS idx_accuracy_result_pipeline ON accuracy_results(pipeline_run_id)',
    'CREATE INDEX IF NOT EXISTS idx_accuracy_result_passed ON accuracy_results(passed)',
    'CREATE INDEX IF NOT EXISTS idx_accuracy_result_tested ON accuracy_results(tested_at)',
    'CREATE INDEX IF NOT EXISTS idx_optimization_schema ON optimization_actions(schema_id)',
    'CREATE INDEX IF NOT EXISTS idx_optimization_pipeline ON optimization_actions(pipeline_run_id)',
    'CREATE INDEX IF NOT EXISTS idx_optimization_type ON optimization_actions(action_type)',
    'CREATE INDEX IF NOT EXISTS idx_optimization_applied ON optimization_actions(applied)',
    'CREATE INDEX IF NOT EXISTS idx_optimization_success ON optimization_actions(success)',
  ];

  for (const idx of indexes) {
    try {
      await db.execute(sql.raw(idx));
    } catch {
      // Ignore index errors
    }
  }
  console.log('Created indexes');

  console.log('Migration complete!');
  await client.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
