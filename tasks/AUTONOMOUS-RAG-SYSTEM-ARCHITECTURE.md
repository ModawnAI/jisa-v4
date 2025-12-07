# Autonomous Document Processing & Self-Improving RAG System

## Vision

Create a **generalized, self-improving document processing pipeline** that can:

1. **Discover** - Analyze unknown document formats and infer structure
2. **Parse** - Generate parsing logic dynamically from discovered schemas
3. **Embed** - Optimize embedding strategies for query patterns
4. **Test** - Automatically generate and run accuracy tests
5. **Learn** - Self-improve based on feedback and failure analysis

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS RAG PROCESSING PIPELINE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │   Document   │───▶│    Schema    │───▶│   Adaptive   │───▶│  Vector   │ │
│  │   Analyzer   │    │   Discovery  │    │    Parser    │    │  Upserter │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └───────────┘ │
│         │                   │                   │                   │       │
│         ▼                   ▼                   ▼                   ▼       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        SCHEMA REGISTRY                                │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │ Discovered  │  │  Embedding  │  │   Query     │  │   Field     │  │  │
│  │  │  Schemas    │  │  Templates  │  │  Patterns   │  │  Mappings   │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│         │                   │                   │                   │       │
│         ▼                   ▼                   ▼                   ▼       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │     RAG      │───▶│   Ground     │───▶│   Accuracy   │───▶│  Feedback │ │
│  │    Query     │    │    Truth     │    │   Analyzer   │    │   Loop    │ │
│  │   Engine     │    │  Extractor   │    │              │    │           │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └───────────┘ │
│                                                                      │      │
│                              ┌───────────────────────────────────────┘      │
│                              ▼                                              │
│                       ┌──────────────┐                                      │
│                       │    Self      │                                      │
│                       │  Optimizer   │──────────▶ [Back to Schema Registry] │
│                       └──────────────┘                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Document Analyzer (`lib/autonomous/document-analyzer.ts`)

Analyzes unknown documents to discover structure:

```typescript
interface DocumentAnalysis {
  documentType: 'excel' | 'pdf' | 'csv' | 'json' | 'unknown';
  structure: {
    sheets?: SheetAnalysis[];       // For Excel
    sections?: SectionAnalysis[];   // For PDF
    tables?: TableAnalysis[];       // Detected tables
  };
  confidence: number;
  suggestedSchemaId?: string;       // Match to existing schema
  rawSample: Record<string, unknown>;
}

interface SheetAnalysis {
  name: string;
  headerRow: number;
  headers: ColumnAnalysis[];
  dataStartRow: number;
  rowCount: number;
  keyColumns: string[];             // Detected primary keys
  foreignKeys: ForeignKeyRelation[];
}

interface ColumnAnalysis {
  name: string;
  inferredType: 'string' | 'number' | 'date' | 'currency' | 'percentage' | 'id';
  nullable: boolean;
  uniqueness: number;               // 0-1 scale
  sampleValues: unknown[];
  semanticCategory?: string;        // 'employee_id', 'amount', 'date', etc.
}
```

### 2. Schema Discovery Engine (`lib/autonomous/schema-discovery.ts`)

Uses LLM to understand document semantics:

```typescript
interface DiscoveredSchema {
  id: string;
  version: number;
  name: string;
  description: string;

  // Structure
  entityType: string;               // 'compensation', 'contract', 'employee'
  primaryKey: string[];
  fields: FieldDefinition[];
  relationships: RelationshipDefinition[];

  // Processing hints
  chunkingStrategy: ChunkingStrategy;
  embeddingTemplate: EmbeddingTemplate;
  queryPatterns: QueryPattern[];

  // Metadata
  sourceDocuments: string[];
  discoveredAt: Date;
  accuracy: number;                 // From testing
  usageCount: number;
}

interface FieldDefinition {
  name: string;
  type: FieldType;
  aliases: string[];                // Korean/English synonyms
  semanticRole: SemanticRole;       // 'primary_amount', 'identifier', 'category'
  required: boolean;
  defaultValue?: unknown;

  // For RAG
  indexable: boolean;
  filterable: boolean;
  embeddingWeight: number;          // 0-1, importance in embedding
}

type SemanticRole =
  | 'identifier'      // 사번, ID
  | 'name'            // 이름
  | 'amount'          // 금액
  | 'date'            // 날짜
  | 'period'          // 기간 (월, 분기)
  | 'count'           // 건수
  | 'category'        // 분류
  | 'organization'    // 조직
  | 'status';         // 상태
```

### 3. Adaptive Parser (`lib/autonomous/adaptive-parser.ts`)

Generates parsing logic from schemas:

```typescript
interface AdaptiveParserConfig {
  schema: DiscoveredSchema;
  strictMode: boolean;              // Fail on schema mismatch vs adapt
  inferMissing: boolean;            // Infer values for missing fields
  validateData: boolean;            // Run validation rules
}

class AdaptiveParser {
  /**
   * Parse document using discovered schema
   * Returns parsed entities with confidence scores
   */
  async parse(
    document: Buffer,
    config: AdaptiveParserConfig
  ): Promise<ParseResult> {
    // 1. Detect document structure
    const analysis = await this.analyzer.analyze(document);

    // 2. Match to schema (or discover new)
    const schema = await this.matchOrDiscover(analysis, config.schema);

    // 3. Generate parsing rules
    const rules = this.generateParsingRules(schema, analysis);

    // 4. Extract entities
    const entities = await this.extractEntities(document, rules);

    // 5. Validate and enrich
    const validated = await this.validateAndEnrich(entities, schema);

    return {
      entities: validated,
      schema,
      confidence: this.calculateConfidence(validated),
      warnings: this.collectWarnings(),
    };
  }

  /**
   * Dynamically generate field extraction logic
   */
  private generateParsingRules(
    schema: DiscoveredSchema,
    analysis: DocumentAnalysis
  ): ParsingRule[] {
    const rules: ParsingRule[] = [];

    for (const field of schema.fields) {
      // Find matching column in document
      const match = this.findColumnMatch(field, analysis);

      if (match) {
        rules.push({
          field: field.name,
          source: match.columnName,
          transform: this.inferTransform(field, match),
          validation: this.generateValidation(field),
        });
      } else if (field.required) {
        rules.push({
          field: field.name,
          source: null,
          fallback: field.defaultValue,
          warning: `Required field ${field.name} not found in document`,
        });
      }
    }

    return rules;
  }
}
```

### 4. Embedding Strategy Engine (`lib/autonomous/embedding-strategy.ts`)

Optimizes embedding text generation:

```typescript
interface EmbeddingTemplate {
  id: string;
  schemaId: string;
  version: number;

  // Template structure
  sections: EmbeddingSection[];

  // Optimization parameters
  maxLength: number;
  priorityFields: string[];
  semanticAnchors: string[];        // Keywords for better matching

  // Performance metrics
  avgRelevanceScore: number;
  querySuccessRate: number;
}

interface EmbeddingSection {
  name: string;
  template: string;                 // Handlebars-style template
  fields: string[];
  weight: number;                   // Importance 0-1
  conditional?: string;             // Only include if condition met
}

class EmbeddingStrategyEngine {
  /**
   * Generate optimal embedding text for an entity
   */
  generateEmbeddingText(
    entity: Record<string, unknown>,
    template: EmbeddingTemplate
  ): string {
    const sections: string[] = [];

    for (const section of template.sections.sort((a, b) => b.weight - a.weight)) {
      // Check conditional
      if (section.conditional && !this.evaluateCondition(section.conditional, entity)) {
        continue;
      }

      // Render section
      const rendered = this.renderTemplate(section.template, entity);
      if (rendered.trim()) {
        sections.push(rendered);
      }
    }

    // Add semantic anchors for better search matching
    if (template.semanticAnchors.length > 0) {
      sections.push(`[키워드: ${template.semanticAnchors.join(', ')}]`);
    }

    return sections.join('\n\n');
  }

  /**
   * Optimize template based on query feedback
   */
  async optimizeTemplate(
    template: EmbeddingTemplate,
    feedback: QueryFeedback[]
  ): Promise<EmbeddingTemplate> {
    // Analyze which fields correlate with successful queries
    const fieldSuccess = this.analyzeFieldSuccess(feedback);

    // Adjust weights based on success rates
    const optimizedSections = template.sections.map(section => ({
      ...section,
      weight: this.calculateOptimalWeight(section, fieldSuccess),
    }));

    // Add missing semantic anchors from successful queries
    const newAnchors = this.extractSuccessfulQueryTerms(feedback);

    return {
      ...template,
      version: template.version + 1,
      sections: optimizedSections,
      semanticAnchors: [...new Set([...template.semanticAnchors, ...newAnchors])],
    };
  }
}
```

### 5. Ground Truth Extractor (`lib/autonomous/ground-truth.ts`)

Automatically extracts test data from documents:

```typescript
interface GroundTruth {
  schemaId: string;
  documentId: string;
  entities: GroundTruthEntity[];
  extractedAt: Date;
  confidence: number;
}

interface GroundTruthEntity {
  identifier: Record<string, unknown>;  // Primary key values
  fields: Record<string, {
    value: unknown;
    confidence: number;
    source: string;                     // Cell reference, line number
  }>;
}

class GroundTruthExtractor {
  /**
   * Extract ground truth from parsed document
   * This becomes the "expected" values for RAG testing
   */
  async extract(
    document: Buffer,
    schema: DiscoveredSchema
  ): Promise<GroundTruth> {
    const parsed = await this.parser.parse(document, { schema, strictMode: true });

    const entities: GroundTruthEntity[] = [];

    for (const entity of parsed.entities) {
      const identifier: Record<string, unknown> = {};
      const fields: Record<string, GroundTruthField> = {};

      // Extract primary key
      for (const keyField of schema.primaryKey) {
        identifier[keyField] = entity[keyField];
      }

      // Extract all fields with confidence
      for (const field of schema.fields) {
        if (entity[field.name] !== undefined) {
          fields[field.name] = {
            value: entity[field.name],
            confidence: parsed.fieldConfidence?.[field.name] || 1.0,
            source: parsed.fieldSources?.[field.name] || 'unknown',
          };
        }
      }

      entities.push({ identifier, fields });
    }

    return {
      schemaId: schema.id,
      documentId: parsed.documentId,
      entities,
      extractedAt: new Date(),
      confidence: parsed.confidence,
    };
  }
}
```

### 6. RAG Accuracy Analyzer (`lib/autonomous/accuracy-analyzer.ts`)

Tests RAG responses against ground truth:

```typescript
interface AccuracyTest {
  id: string;
  query: string;
  queryPattern: string;             // Template: "내 {field} 알려줘"
  targetEntity: Record<string, unknown>;
  expectedFields: string[];
  expectedValues: Record<string, unknown>;
}

interface AccuracyResult {
  testId: string;
  passed: boolean;
  accuracy: number;                 // 0-1

  response: string;
  extractedValues: Record<string, unknown>;

  discrepancies: Discrepancy[];

  // Debugging info
  searchResults: number;
  topScore: number;
  filters: Record<string, unknown>;
  processingTime: number;
}

interface Discrepancy {
  field: string;
  expected: unknown;
  actual: unknown;
  type: 'missing' | 'wrong_value' | 'format_mismatch';
  severity: 'critical' | 'high' | 'medium' | 'low';
}

class AccuracyAnalyzer {
  /**
   * Generate test cases from ground truth
   */
  generateTests(
    groundTruth: GroundTruth,
    schema: DiscoveredSchema
  ): AccuracyTest[] {
    const tests: AccuracyTest[] = [];

    for (const entity of groundTruth.entities) {
      // Generate tests for each query pattern
      for (const pattern of schema.queryPatterns) {
        const test = this.createTestFromPattern(entity, pattern, schema);
        tests.push(test);
      }

      // Generate edge case tests
      tests.push(...this.generateEdgeCaseTests(entity, schema));
    }

    return tests;
  }

  /**
   * Run accuracy test suite
   */
  async runTests(
    tests: AccuracyTest[],
    context: RAGContext
  ): Promise<AccuracyReport> {
    const results: AccuracyResult[] = [];

    for (const test of tests) {
      const result = await this.runSingleTest(test, context);
      results.push(result);
    }

    return this.generateReport(results);
  }

  /**
   * Analyze failures to identify patterns
   */
  analyzeFailures(results: AccuracyResult[]): FailureAnalysis {
    const failures = results.filter(r => !r.passed);

    return {
      totalFailures: failures.length,
      byType: this.groupByDiscrepancyType(failures),
      byField: this.groupByField(failures),
      patterns: this.identifyFailurePatterns(failures),
      recommendations: this.generateRecommendations(failures),
    };
  }
}
```

### 7. Self-Optimizer (`lib/autonomous/self-optimizer.ts`)

The brain of the self-improving system:

```typescript
interface OptimizationAction {
  type: 'schema_update' | 'embedding_update' | 'filter_fix' | 'metadata_add';
  target: string;
  change: Record<string, unknown>;
  reason: string;
  confidence: number;
}

class SelfOptimizer {
  /**
   * Main optimization loop
   */
  async optimize(
    failureAnalysis: FailureAnalysis,
    currentSchema: DiscoveredSchema,
    currentTemplate: EmbeddingTemplate
  ): Promise<OptimizationPlan> {
    const actions: OptimizationAction[] = [];

    // Analyze failure patterns
    for (const pattern of failureAnalysis.patterns) {
      const action = await this.determineAction(pattern);
      if (action) {
        actions.push(action);
      }
    }

    // Prioritize actions by impact
    const prioritized = this.prioritizeActions(actions);

    // Generate execution plan
    return {
      actions: prioritized,
      estimatedImprovement: this.estimateImprovement(prioritized),
      requiredReprocessing: this.determineReprocessingScope(prioritized),
    };
  }

  /**
   * Determine optimization action from failure pattern
   */
  private async determineAction(
    pattern: FailurePattern
  ): Promise<OptimizationAction | null> {
    switch (pattern.type) {
      case 'filter_mismatch':
        // Period format, field name mismatches
        return {
          type: 'metadata_add',
          target: pattern.field,
          change: {
            addAlias: pattern.expectedFieldName,
            normalizeFormat: pattern.suggestedFormat,
          },
          reason: `Filter field "${pattern.filterField}" doesn't match stored "${pattern.storedField}"`,
          confidence: 0.95,
        };

      case 'low_relevance':
        // Embedding text not matching queries
        return {
          type: 'embedding_update',
          target: 'template',
          change: {
            addSemanticAnchors: pattern.queryTerms,
            increaseFieldWeight: pattern.relevantFields,
          },
          reason: `Low relevance scores (${pattern.avgScore}) for query pattern "${pattern.queryPattern}"`,
          confidence: 0.8,
        };

      case 'missing_field':
        // Schema doesn't capture all needed fields
        return {
          type: 'schema_update',
          target: 'schema',
          change: {
            addField: {
              name: pattern.missingField,
              aliases: pattern.detectedAliases,
              source: pattern.suggestedSource,
            },
          },
          reason: `Queries for "${pattern.missingField}" consistently fail`,
          confidence: 0.85,
        };

      default:
        return null;
    }
  }

  /**
   * Apply optimization actions
   */
  async applyOptimizations(
    plan: OptimizationPlan,
    context: OptimizationContext
  ): Promise<OptimizationResult> {
    const applied: AppliedAction[] = [];

    for (const action of plan.actions) {
      try {
        const result = await this.applyAction(action, context);
        applied.push({ action, success: true, result });
      } catch (error) {
        applied.push({ action, success: false, error: String(error) });
      }
    }

    // Trigger reprocessing if needed
    if (plan.requiredReprocessing.length > 0) {
      await this.triggerReprocessing(plan.requiredReprocessing);
    }

    return {
      applied,
      successRate: applied.filter(a => a.success).length / applied.length,
      nextTestRun: new Date(Date.now() + 5 * 60 * 1000), // 5 min
    };
  }
}
```

### 8. Pipeline Orchestrator (`lib/autonomous/pipeline-orchestrator.ts`)

Coordinates the entire autonomous flow:

```typescript
interface PipelineState {
  documentId: string;
  status: PipelineStatus;
  currentPhase: PipelinePhase;

  // Results from each phase
  analysis?: DocumentAnalysis;
  schema?: DiscoveredSchema;
  parseResult?: ParseResult;
  upsertResult?: UpsertResult;
  groundTruth?: GroundTruth;
  testResults?: AccuracyReport;
  optimizationPlan?: OptimizationPlan;

  // Iteration tracking
  iteration: number;
  accuracyHistory: number[];

  // Timing
  startedAt: Date;
  completedAt?: Date;
}

type PipelinePhase =
  | 'analyzing'
  | 'discovering_schema'
  | 'parsing'
  | 'upserting'
  | 'extracting_ground_truth'
  | 'testing'
  | 'optimizing'
  | 'reprocessing'
  | 'completed'
  | 'failed';

class PipelineOrchestrator {
  /**
   * Process a new document through the autonomous pipeline
   */
  async processDocument(
    document: Buffer,
    options: ProcessingOptions
  ): Promise<PipelineState> {
    const state: PipelineState = {
      documentId: generateId(),
      status: 'running',
      currentPhase: 'analyzing',
      iteration: 0,
      accuracyHistory: [],
      startedAt: new Date(),
    };

    try {
      // Phase 1: Analyze document structure
      state.analysis = await this.analyzer.analyze(document);
      state.currentPhase = 'discovering_schema';

      // Phase 2: Discover or match schema
      state.schema = await this.schemaDiscovery.discoverOrMatch(
        state.analysis,
        options.schemaHints
      );
      state.currentPhase = 'parsing';

      // Phase 3: Parse with adaptive parser
      state.parseResult = await this.parser.parse(document, {
        schema: state.schema,
        strictMode: false,
        inferMissing: true,
      });
      state.currentPhase = 'upserting';

      // Phase 4: Generate embeddings and upsert
      state.upsertResult = await this.upserter.upsert(
        state.parseResult,
        state.schema
      );
      state.currentPhase = 'extracting_ground_truth';

      // Phase 5: Extract ground truth for testing
      state.groundTruth = await this.groundTruthExtractor.extract(
        document,
        state.schema
      );
      state.currentPhase = 'testing';

      // Phase 6: Run accuracy tests
      const tests = this.accuracyAnalyzer.generateTests(
        state.groundTruth,
        state.schema
      );
      state.testResults = await this.accuracyAnalyzer.runTests(
        tests,
        this.createContext(state)
      );
      state.accuracyHistory.push(state.testResults.accuracy);

      // Phase 7: Self-optimize if needed
      if (state.testResults.accuracy < options.targetAccuracy) {
        state.currentPhase = 'optimizing';
        await this.optimizationLoop(state, options);
      }

      state.status = 'completed';
      state.currentPhase = 'completed';
      state.completedAt = new Date();

    } catch (error) {
      state.status = 'failed';
      state.currentPhase = 'failed';
      state.error = String(error);
    }

    return state;
  }

  /**
   * Self-improvement loop until target accuracy reached
   */
  private async optimizationLoop(
    state: PipelineState,
    options: ProcessingOptions
  ): Promise<void> {
    const MAX_ITERATIONS = options.maxOptimizationIterations || 5;

    while (
      state.iteration < MAX_ITERATIONS &&
      state.testResults!.accuracy < options.targetAccuracy
    ) {
      state.iteration++;

      // Analyze failures
      const failureAnalysis = this.accuracyAnalyzer.analyzeFailures(
        state.testResults!.results
      );

      // Generate optimization plan
      state.optimizationPlan = await this.optimizer.optimize(
        failureAnalysis,
        state.schema!,
        this.getEmbeddingTemplate(state.schema!.id)
      );

      // Apply optimizations
      await this.optimizer.applyOptimizations(
        state.optimizationPlan,
        { state, options }
      );

      // Reprocess if needed
      if (state.optimizationPlan.requiredReprocessing.length > 0) {
        state.currentPhase = 'reprocessing';
        await this.reprocessEntities(state);
      }

      // Re-test
      state.currentPhase = 'testing';
      state.testResults = await this.accuracyAnalyzer.runTests(
        this.accuracyAnalyzer.generateTests(state.groundTruth!, state.schema!),
        this.createContext(state)
      );
      state.accuracyHistory.push(state.testResults.accuracy);

      // Log progress
      console.log(
        `[Pipeline] Iteration ${state.iteration}: ` +
        `Accuracy ${(state.testResults.accuracy * 100).toFixed(1)}% ` +
        `(target: ${(options.targetAccuracy * 100).toFixed(1)}%)`
      );
    }
  }
}
```

---

## Database Schema Extensions

```sql
-- Schema Registry
CREATE TABLE discovered_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  entity_type VARCHAR(100) NOT NULL,

  -- Schema definition (JSON)
  fields JSONB NOT NULL,
  primary_key VARCHAR(255)[] NOT NULL,
  relationships JSONB,

  -- Processing configuration
  chunking_strategy JSONB NOT NULL,
  embedding_template_id UUID REFERENCES embedding_templates(id),
  query_patterns JSONB,

  -- Metrics
  accuracy DECIMAL(5,4),
  usage_count INT DEFAULT 0,

  -- Timestamps
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(name, version)
);

-- Embedding Templates
CREATE TABLE embedding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id UUID REFERENCES discovered_schemas(id),
  version INT NOT NULL DEFAULT 1,

  -- Template definition
  sections JSONB NOT NULL,
  semantic_anchors VARCHAR(255)[],
  max_length INT DEFAULT 8000,

  -- Performance metrics
  avg_relevance_score DECIMAL(5,4),
  query_success_rate DECIMAL(5,4),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ground Truth Storage
CREATE TABLE ground_truth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id UUID REFERENCES discovered_schemas(id),
  document_id UUID REFERENCES documents(id),

  -- Entity data
  entity_identifier JSONB NOT NULL,
  field_values JSONB NOT NULL,

  -- Metadata
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confidence DECIMAL(5,4) NOT NULL,

  UNIQUE(document_id, entity_identifier)
);

-- Accuracy Test Results
CREATE TABLE accuracy_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id UUID REFERENCES discovered_schemas(id),

  -- Test definition
  query TEXT NOT NULL,
  query_pattern VARCHAR(255),
  target_entity JSONB NOT NULL,
  expected_fields VARCHAR(255)[],
  expected_values JSONB NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE accuracy_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES accuracy_tests(id),
  pipeline_iteration INT NOT NULL,

  -- Results
  passed BOOLEAN NOT NULL,
  accuracy DECIMAL(5,4) NOT NULL,
  response TEXT,
  extracted_values JSONB,
  discrepancies JSONB,

  -- Debug info
  search_results_count INT,
  top_score DECIMAL(5,4),
  filters_used JSONB,
  processing_time_ms INT,

  tested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optimization History
CREATE TABLE optimization_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id UUID REFERENCES discovered_schemas(id),
  pipeline_run_id UUID,
  iteration INT,

  -- Action details
  action_type VARCHAR(50) NOT NULL,
  target VARCHAR(255) NOT NULL,
  change JSONB NOT NULL,
  reason TEXT,
  confidence DECIMAL(5,4),

  -- Result
  applied BOOLEAN NOT NULL,
  success BOOLEAN,
  error TEXT,

  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

1. **Database Schema** - Create tables for schema registry, templates, ground truth
2. **Document Analyzer** - Basic Excel/PDF structure detection
3. **Schema Registry Service** - CRUD for discovered schemas

### Phase 2: Schema Discovery (Week 2)

1. **LLM-Powered Schema Discovery** - Use Gemini to understand document semantics
2. **Schema Matching** - Match new documents to existing schemas
3. **Schema Versioning** - Handle schema evolution

### Phase 3: Adaptive Parsing (Week 3)

1. **Dynamic Parser Generation** - Generate parsing rules from schema
2. **Field Mapping** - Intelligent column-to-field matching
3. **Validation Rules** - Auto-generate validation from types

### Phase 4: Embedding Optimization (Week 4)

1. **Template Engine** - Handlebars-style embedding templates
2. **Semantic Anchor System** - Add queryable keywords
3. **Weight Optimization** - Adjust section weights based on feedback

### Phase 5: Testing Framework (Week 5)

1. **Ground Truth Extraction** - Auto-extract test data
2. **Test Generation** - Generate tests from query patterns
3. **Accuracy Analysis** - Comprehensive failure analysis

### Phase 6: Self-Improvement (Week 6)

1. **Pattern Detection** - Identify failure patterns
2. **Action Generation** - Determine optimization actions
3. **Automatic Application** - Apply fixes automatically
4. **Iteration Loop** - Repeat until target accuracy

---

## Usage Example

```typescript
// Initialize the autonomous pipeline
const pipeline = new PipelineOrchestrator({
  analyzer: documentAnalyzer,
  schemaDiscovery: schemaDiscoveryEngine,
  parser: adaptiveParser,
  upserter: vectorUpserter,
  groundTruthExtractor: groundTruthExtractor,
  accuracyAnalyzer: accuracyAnalyzer,
  optimizer: selfOptimizer,
});

// Process a new unknown document
const result = await pipeline.processDocument(excelBuffer, {
  targetAccuracy: 0.95,           // 95% accuracy target
  maxOptimizationIterations: 5,
  schemaHints: {
    entityType: 'compensation',   // Optional hint
  },
});

console.log(`Final accuracy: ${(result.testResults.accuracy * 100).toFixed(1)}%`);
console.log(`Iterations: ${result.iteration}`);
console.log(`Accuracy history: ${result.accuracyHistory.map(a => (a * 100).toFixed(1) + '%').join(' → ')}`);

// Example output:
// Final accuracy: 96.8%
// Iterations: 3
// Accuracy history: 46.9% → 72.5% → 89.3% → 96.8%
```

---

## Next Steps

1. **Immediate**: Fix the 4 critical issues in current RAG (metadata fields, period format, employee ID)
2. **Short-term**: Implement schema registry and ground truth extraction
3. **Medium-term**: Build adaptive parser and embedding optimizer
4. **Long-term**: Full self-improvement loop with automatic reprocessing
