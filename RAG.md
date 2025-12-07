 RAG SCHEMA & NAMESPACE STRATEGY DEEP DIVE

       I've thoroughly explored the RAG system architecture. Here's a complete breakdown of how database
       schemas drive the RAG system's behavior:

       ---
       1. CORE RAG DATABASE SCHEMAS

       A. RAG Template Schema Registry (rag-schema.ts)

       The ragTemplateSchemas table is the heart of the intent-aware RAG system. It dynamically defines what
        document types the system understands and how to query them.

       Key Structure:
       ragTemplateSchemas {
         id: UUID (primary key)
         templateId: UUID (links to documentTemplates)
         templateSlug: string (e.g., 'mdrt', 'compensation')

         // Metadata field definitions
         metadataFields: MetadataFieldDefinition[] (JSON)

         // Chunk type definitions
         chunkTypes: ChunkTypeDefinition[] (JSON)

         // Intent configurations
         supportedIntents: IntentConfiguration[] (JSON)

         // Calculation definitions
         calculations: CalculationDefinition[] (JSON)

         // Few-shot examples
         exampleQueries: ExampleQuery[] (JSON)

         priority: integer (higher = preferred in routing)
         isActive: boolean
       }

       Purpose: This table allows the system to understand what document templates exist, what metadata
       fields they contain, and how to route different query intents to the right processing path.

       Real Example - MDRT Schema:
       From /Users/paksungho/jisa-v4/lib/ai/prompts/query-understanding.ts:

       {
         templateSlug: 'mdrt',
         displayName: 'MDRT 실적',
         description: 'MDRT/COT/TOT 달성을 위한 실적 추적 데이터',

         metadataFields: [
           {
             key: 'totalCommission',
             displayName: '누적 커미션',
             type: 'number',
             isSearchable: true,    // Can use semantic search
             isFilterable: true,    // Can use as Pinecone filter
             isComputable: true,    // Can use in calculations
             unit: 'KRW',
             aliases: ['FYC', '커미션']
           },
           {
             key: 'fycMdrtStatus',
             displayName: 'FYC MDRT 상태',
             type: 'string',
             isSearchable: true,
             isFilterable: true,
             isComputable: false
           },
           {
             key: 'fycMdrtProgress',
             displayName: 'FYC MDRT 진행률',
             type: 'number',
             unit: '%'
           }
         ],

         supportedIntents: [
           { intent: 'direct_lookup', isSupported: true, defaultTopK: 3 },
           { intent: 'calculation', isSupported: true, defaultTopK: 5 }
         ],

         calculations: [
           {
             type: 'mdrt_gap',
             displayName: 'MDRT 달성까지 남은 금액',
             formula: 'MDRT_STANDARD - totalCommission',
             requiredFields: ['totalCommission'],
             resultFormat: 'currency'
           }
         ]
       }

       How It Drives Behavior:
       - When a user asks "MDRT까지 얼마 남았어?" (How much until MDRT?), the query understanding system:
         a. Loads this schema
         b. Identifies intent as calculation
         c. Maps the query to the mdrt_gap calculation
         d. Knows to search for totalCommission field
         e. Routes to mdrt template namespace

       B. Query Intent Logs (queryIntentLogs table)

       Logs every query understanding result for continuous improvement:

       queryIntentLogs {
         id: UUID
         originalQuery: string
         parsedIntent: ParsedIntentLog (JSON) // Full intent structure
         templateUsed: string
         filtersApplied: jsonb
         successful: boolean
         resultsCount: integer
         responseTimeMs: integer

         // Feedback loop
         userFeedback: 'helpful' | 'not_helpful' | 'wrong'
         correctedIntent: jsonb

         // Learning data
         confidence: real (0-1)
         wasAmbiguous: boolean
       }

       Purpose: Feeds improvement cycles - low confidence queries can be reviewed and used to improve schema
        definitions.

       C. Metadata Discovery Cache (metadataDiscoveryCache table)

       Automatically discovers available fields from Pinecone vectors:

       metadataDiscoveryCache {
         namespace: string
         discoveredFields: DiscoveredField[] (JSON)
         sampleSize: integer
         uniqueValuesPerField: jsonb

         discoveredAt: timestamp
         expiresAt: timestamp (24 hours)
       }

       Purpose: Detects new metadata fields added to documents without schema updates - enables automatic
       schema evolution.

       ---
       2. AUTONOMOUS RAG SYSTEM (autonomous-rag.ts)

       For systems that need to test and optimize themselves:

       A. Embedding Templates

       Defines how entity data is converted to embeddings for optimal semantic matching:

       embeddingTemplates {
         schemaSlug: string
         version: integer

         sections: EmbeddingSection[] (JSON) // How to structure text
         {
           name: string
           template: string (Handlebars)
           fields: string[]
           weight: number (0-1)
           conditional?: string
         }

         semanticAnchors: string[] // Key terms for semantic search
         maxLength: integer
         priorityFields: string[]

         // Auto-updated by optimizer
         avgRelevanceScore: real
         querySuccessRate: real
       }

       B. Ground Truth & Accuracy Testing

       For validating RAG accuracy:

       groundTruth {
         schemaId: UUID
         documentId: UUID

         entityIdentifier: jsonb // e.g., { employeeId: 'J00307', period: '202509' }
         fieldValues: {
           fieldName: {
             value: any
             confidence: 0-1
             source: string (cell ref, line number)
           }
         }

         extractionMethod: 'auto' | 'manual' | 'llm'
         isValid: boolean
       }

       accuracyTests {
         schema: UUID
         testSuiteId: string

         query: string
         queryPattern: string // e.g., "내 {field} 알려줘"
         targetEntity: jsonb

         expectedFields: string[]
         expectedValues: {
           field: {
             value: any
             type: 'exact' | 'contains' | 'regex' | 'numeric_range'
             tolerance?: number
           }
         }

         valueTolerance: real (0.02 = 2%)
         isActive: boolean
       }

       accuracyResults {
         testId: UUID
         status: 'pending' | 'running' | 'passed' | 'failed'
         passed: boolean
         accuracy: real (0-1)

         response: string
         extractedValues: jsonb

         discrepancies: Discrepancy[] // What failed

         // Debug info
         searchResultsCount: integer
         topScore: real
         namespaceSearched: string
         routeType: 'instant' | 'rag' | 'clarify' | 'fallback'
       }

       C. Optimization Actions

       Tracks self-improvement:

       optimizationActions {
         schemaId: UUID
         actionType: 'schema_update' | 'embedding_update' | 'filter_fix' | 'metadata_add' | 'field_alias'

         target: string (e.g., 'schema', 'embedding_template')
         change: OptimizationChange // before/after
         reason: string
         confidence: real

         failurePatterns: FailurePattern[] // What we're fixing

         applied: boolean
         success: boolean
         accuracyBefore: real
         accuracyAfter: real
         improvementPercent: real
       }

       pipelineRuns {
         documentId: UUID
         schemaId: UUID

         status: 'pending' | 'running' | 'completed' | 'failed'
         currentPhase: 'analyzing' | 'parsing' | 'upserting' | 'testing' | 'optimizing'

         targetAccuracy: real (0.95 default)
         maxIterations: integer (5 default)

         finalAccuracy: real
         totalIterations: integer
         accuracyHistory: number[]

         optimizationsApplied: integer
       }

       ---
       3. KNOWLEDGE CHUNKS & DOCUMENT TEMPLATES

       A. Knowledge Chunks (knowledge-chunks.ts)

       The actual content chunks stored for retrieval:

       knowledgeChunks {
         id: UUID
         documentId: UUID
         chunkIndex: integer
         totalChunks: integer

         content: text (actual chunk text)
         contentHash: text (unique per content)

         embeddingModel: text (e.g., 'text-embedding-3-large')

         // Link to Pinecone
         pineconeId: text (unique)
         pineconeNamespace: text (e.g., 'emp_J00307' or 'org_company')

         // Denormalized metadata
         employeeId: text
         categorySlug: text
         period: text (e.g., '202509')

         // Extended metadata (JSON)
         metadata: jsonb {
           documentId: string
           organizationId: string
           employeeId?: string
           categoryId?: string
           chunkIndex: number
           contentHash: string
           clearanceLevel: 'basic' | 'standard' | 'advanced'
           processingBatchId?: string
           originalRowIndex?: number
           createdAt: string
           [key: string]: any // Template-specific fields
         }
       }

       B. Document Templates (templates.ts)

       Defines how Excel/CSV files are parsed:

       documentTemplates {
         id: UUID
         slug: text (e.g., 'mdrt', 'compensation')

         // File processing
         fileType: 'excel' | 'csv' | 'pdf' | 'word'
         processingMode: 'company' | 'employee_split' | 'employee_aggregate'
         // - company: Single doc for org
         // - employee_split: Separate vectors for each employee
         // - employee_aggregate: Multiple employees in one doc

         // Chunking
         chunkingStrategy: 'auto' | 'row_per_chunk' | 'fixed_size' | 'semantic'
         chunkSize: integer (e.g., 1024)
         chunkOverlap: integer

         // Recurring documents
         isRecurring: boolean
         recurringPeriod: 'monthly' | 'quarterly' | 'yearly'
         retentionDays: integer
       }

       templateColumnMappings {
         templateId: UUID

         // Source column from Excel
         sourceColumn: string (e.g., 'A', 'B')
         sourceColumnIndex: integer

         // Target field
         targetField: string (e.g., 'totalCommission')
         targetFieldType: 'string' | 'number' | 'date' | 'currency'

         // How to use this field
         fieldRole: 'employee_identifier' | 'content' | 'metadata' | 'skip'
         // - employee_identifier: Employee ID column
         // - content: Include in chunk text
         // - metadata: Store as metadata but not in chunk
         // - skip: Ignore this column

         // Transformation
         transformFunction: string (e.g., 'parseFloat')
         defaultValue: string

         // Validation
         isRequired: boolean
         validationRegex: string
       }

       C. Detailed Records (detailed-records.ts)

       Structured data extracted from documents:

       // Multiple tables for different record types:
       employeeCommissions {
         employeeId: text
         documentId: UUID
         period: text (e.g., '202509')

         // Individual fields
         commissionAmount: decimal
         commissionRate: decimal
         premiumAmount: decimal

         rawData: jsonb (original row)
       }

       employeePerformance {
         employeeId: text
         documentId: UUID
         period: text

         performanceType: text ('monthly' | 'quarterly' | 'yearly')
         metricName: text
         metricValue: decimal
         targetValue: decimal
         achievementRate: decimal
       }

       // Similar tables for: overrides, incentives, clawbacks, allowances

       Purpose: Enables precise filtering/calculations when processing documents.

       ---
       4. NAMESPACE STRATEGY

       A. Namespace Prefixes (namespace-strategy.service.ts)

       Three types of namespaces in Pinecone:

       emp_{employeeId}    → Employee-specific documents
                              Only that employee can access their data
                              Examples: emp_J00307, emp_A12345

       org_{organizationId} → Organization-wide documents
                              All employees in org can access
                              Examples: org_main, org_sales_team

       public               → Public documents
                              Everyone can access
                              Examples: policies, guidelines

       B. Namespace Search Strategy

       The NamespaceStrategyService applies intent-specific weights to prioritize results:

       interface NamespaceSearchStrategy {
         namespaces: string[]              // Which namespaces to search
         weights: Record<string, number>   // Score multipliers per namespace
         fallbackOrder: string[]           // Search order if results are low
         searchSequentially: boolean       // Search one by one vs parallel
         description: string               // Human readable description
       }

       // Default weights by type
       DEFAULT_WEIGHTS = {
         employee: 1.5,      // Personal data is MOST relevant
         organization: 1.0,  // Org data is baseline
         public: 0.8,        // Public data is least relevant
       }

       Intent-Specific Strategies:

       direct_lookup {
         priorityOrder: ['employee', 'organization', 'public']
         weights: { employee: 1.5, organization: 1.0, public: 0.7 }
         requiresEmployee: true
         // Query: "내 실수령액 알려줘" (Tell me my net pay)
         // Searches emp_J00307 FIRST, then org_main, then public
       }

       calculation {
         priorityOrder: ['employee']
         weights: { employee: 1.0 }
         requiresEmployee: true
         // Query: "MDRT까지 얼마 남았어?" (How much until MDRT?)
         // ONLY searches emp_J00307
       }

       comparison {
         priorityOrder: ['employee', 'organization']
         weights: { employee: 1.3, organization: 1.0 }
         requiresEmployee: true
         // Query: "이번달 대비 지난달" (This month vs last month)
         // Searches emp_J00307 (boosted), then org_main
       }

       aggregation {
         priorityOrder: ['employee', 'organization']
         weights: { employee: 1.2, organization: 1.0 }
         requiresEmployee: true
         // Query: "총 커미션" (Total commission)
         // Searches emp_J00307 (slightly boosted), then org_main
       }

       general_qa {
         priorityOrder: ['public', 'organization', 'employee']
         weights: { public: 1.2, organization: 1.0, employee: 0.8 }
         requiresEmployee: false
         // Query: "오버라이드가 뭐야?" (What is override?)
         // Searches public FIRST, then org_main, then emp_J00307
       }

       How It Works:

       // Example: User asks "내 커미션이 얼마야?" (What's my commission?)
       // Employee: J00307

       // Step 1: Parse intent → direct_lookup
       // Step 2: Get strategy for direct_lookup
       //   namespaces: ['emp_J00307', 'org_main', 'public']
       //   weights: { 'emp_J00307': 1.5, 'org_main': 1.0, 'public': 0.7 }

       // Step 3: Search all namespaces in parallel
       // Step 4: Apply weights to results
       //   emp_J00307 result with score 0.85 → 0.85 * 1.5 = 1.275 ✓ (ranked higher)
       //   org_main result with score 0.90 → 0.90 * 1.0 = 0.90  (ranked lower)
       //   public result with score 0.92 → 0.92 * 0.7 = 0.644 (ranked lowest)

       // Step 5: Sort by weighted score
       // Result: [emp_J00307 (1.275), org_main (0.90), public (0.644)]

       ---
       5. METADATA STRUCTURE IN PINECONE VECTORS

       Each vector in Pinecone stores rich metadata:

       interface VectorMetadata {
         // Core identification
         documentId: string                    // Which document this came from
         organizationId: string                // Which organization
         employeeId?: string                   // If employee-specific
         categoryId?: string                   // Document category

         // Chunk tracking
         chunkIndex: number                    // Which chunk (1, 2, 3...)
         contentHash: string                   // Unique hash of content

         // Security
         clearanceLevel: 'basic' | 'standard' | 'advanced'

         // Processing metadata
         processingBatchId?: string            // Which batch processed it
         originalRowIndex?: number             // Row number in Excel

         createdAt: string                     // ISO timestamp

         // Template-specific fields (dynamic)
         // These come from documentTemplate columnMappings with fieldRole: 'metadata'
         [key: string]: string | number | boolean | string[] | null | undefined

         // Examples for MDRT template:
         // period: '202509'
         // employeeId: 'J00307'
         // fycMdrtStatus: 'mdrt'
         // fycMdrtProgress: 87.5
       }

       Storage Location:
       - Database: knowledgeChunks.metadata (denormalized for quick access)
       - Pinecone: Each vector's metadata field (for server-side filtering)

       Example Pinecone Vector (MDRT document for emp_J00307):
       {
         "id": "chunk_12345",
         "values": [0.123, 0.456, ...],  // 3072-dimensional embedding
         "metadata": {
           "documentId": "doc_67890",
           "organizationId": "org_main",
           "employeeId": "J00307",
           "categoryId": "mdrt",
           "chunkIndex": 1,
           "contentHash": "abc123def456",
           "clearanceLevel": "standard",
           "period": "202509",
           "fycMdrtStatus": "mdrt",
           "fycMdrtProgress": 87.5,
           "totalCommission": 125000000,
           "createdAt": "2025-09-15T10:30:00Z"
         }
       }

       Filtering with Metadata:
       // Find vectors for specific employee and period
       filter: {
         $and: [
           { employeeId: { $eq: 'J00307' } },
           { period: { $eq: '202509' } },
           { clearanceLevel: { $in: ['basic', 'standard', 'advanced'] } }
         ]
       }

       ---
       6. HOW THE PIECES FIT TOGETHER

       Complete Query Flow Example

       User: "MDRT까지 얼마 남았어?" (How much until MDRT?)
       Employee ID: J00307

       Step 1: Load RAG Schema
       Fetch from ragTemplateSchemas where templateSlug='mdrt'
       → Gets MDRT metadata fields, calculations, supported intents

       Step 2: Understand Query Intent
       System loads DEFAULT_RAG_SCHEMAS (compensation, mdrt, general)
       Builds dynamic prompt with available metadata fields
       Calls Gemini: "Parse this query using available schemas"
       → Gemini returns:
       {
         intent: 'calculation',
         template: 'mdrt',
         fields: ['totalCommission', 'fycMdrtProgress'],
         calculation: {
           type: 'mdrt_gap',
           params: { standard: 'fycMdrt' }
         },
         confidence: 0.98
       }

       Step 3: Apply Namespace Strategy
       Intent = 'calculation' → requires employee namespace ONLY
       Strategy:
         namespaces: ['emp_J00307']
         weights: { 'emp_J00307': 1.0 }
         searchSequentially: true
         (calculations don't use public/org namespaces)

       Step 4: Embed & Search
       Embed the query using OpenAI text-embedding-3-large
       Query Pinecone in namespace 'emp_J00307':

       Query:
         vector: [0.123, 0.456, ...] (query embedding)
         topK: 5
         filter: {
           $and: [
             { period: { $eq: '202509' } },        // Latest period
             { clearanceLevel: { $in: ['basic', 'standard', 'advanced'] } }
           ]
         }

       → Returns 5 chunks with highest semantic similarity
         Each chunk contains: totalCommission, fycMdrtStatus, fycMdrtProgress in metadata

       Step 5: Extract Values & Calculate
       From search results metadata, extract:
         totalCommission: 125,000,000 KRW

       From RAG schema, get MDRT standard for FYC:
         MDRT_FYC_STANDARD: 150,000,000 KRW (predefined)

       Apply calculation formula:
         mdrt_gap = MDRT_STANDARD - totalCommission
         mdrt_gap = 150,000,000 - 125,000,000 = 25,000,000 KRW

       Step 6: Generate Response
       Gemini generates response with calculation result:
       "MDRT까지 2,500만원 더 필요합니다.
       현재 진행률은 83%입니다."

       Step 7: Log for Improvement
       Insert into queryIntentLogs:
       {
         originalQuery: "MDRT까지 얼마 남았어?",
         parsedIntent: { ... },
         templateUsed: 'mdrt',
         calculationPerformed: 'mdrt_gap',
         successful: true,
         resultsCount: 5,
         responseTimeMs: 245,
         confidence: 0.98
       }

       ---
       7. KEY ARCHITECTURAL INSIGHTS

       Dynamic Schema Evolution

       The system DOESN'T require code changes to add new document types:

       1. Upload new Excel template
       2. Configure templateColumnMappings
       3. Inngest processes document → creates chunks
       4. Chunks upserted with metadata to Pinecone
       5. RagSchemaRegistryService discovers new fields
       6. Query router automatically includes new fields
       7. No code deployment needed!

       Clearance Levels

       Three-tier security model built into metadata:

       clearanceLevel: 'basic' | 'standard' | 'advanced'

       // Employee can see:
       // - Basic: Public documents only
       // - Standard: Public + organization documents
       // - Advanced: Public + organization + personal documents

       // Applied at query time:
       filter: {
         clearanceLevel: { $in: user.clearanceLevels }
       }

       Content vs Metadata Fields

       Two strategies for storing extracted data:

       Content Fields (fieldRole: 'content')
       - Included in chunk text for semantic search
       - Example: Policy descriptions, guidelines
       - Searched by semantic similarity

       Metadata Fields (fieldRole: 'metadata')
       - Stored only as Pinecone metadata
       - Enables precise filtering and calculations
       - NOT included in semantic search
       - Examples: period, totalCommission, employeeId

       Example (MDRT document):
       Content: "MDRT 달성 현황: 2025년 9월 누적 커미션 125,000,000..."
       Metadata: {
         period: '202509',
         totalCommission: 125000000,
         fycMdrtStatus: 'mdrt',
         fycMdrtProgress: 87.5
       }

       Calculation queries use metadata (fast, precise), while Q&A uses semantic search (flexible,
       contextual).

       ---
       8. RAG METRICS & MONITORING

       The ragMetrics table tracks every query:

       ragMetrics {
         sessionId: text
         employeeId: UUID

         // What happened
         query: text
         route: 'instant' | 'rag' | 'clarify' | 'fallback'
         intentType: text
         templateType: text

         // Timing breakdown (ms)
         routerTimeMs: integer
         intentTimeMs: integer
         embeddingTimeMs: integer
         searchTimeMs: integer
         calculationTimeMs: integer
         generationTimeMs: integer
         totalTimeMs: integer

         // Quality
         namespacesSearched: jsonb (which namespaces had results)
         resultsCount: integer
         topResultScore: real

         // Result
         successful: boolean
         errorCode?: text

         // Clarification tracking
         clarificationAsked: boolean
         clarificationType?: text
         clarificationResolved?: boolean
       }

       This enables:
       - Identifying bottlenecks (which step is slow?)
       - Measuring accuracy (% of queries successful)
       - Finding ambiguous queries (which often ask for clarification)
       - Optimizing namespace weights (do emp results actually score higher?)

       ---
       Summary

       The RAG system's power comes from separating concerns:

       1. Schemas define WHAT data exists (fields, types, calculations)
       2. Templates define HOW to extract it (column mappings, chunking)
       3. Namespaces define WHO can access it (employee, org, public)
       4. Intent routes define WHEN to use each strategy (direct lookup vs calculation vs QA)
       5. Metadata enables precise filtering while keeping semantic search flexible

       All without requiring code changes when adding new document types!
