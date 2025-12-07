/**
 * Dynamic Query Understanding Prompt Builder
 *
 * Generates prompts dynamically from the RAG schema registry,
 * allowing new document types to be added without code changes.
 *
 * Supports two schema sources:
 * 1. Database schemas (RagTemplateSchema) - predefined templates
 * 2. Dynamic schemas (DynamicSchema) - discovered from Pinecone metadata
 */

import type {
  RagTemplateSchema,
  MetadataFieldDefinition,
  CalculationDefinition,
  ExampleQuery,
} from '@/lib/db/schema/rag-schema';
import type { DynamicSchema, DiscoveredField, DiscoveredCalculation } from '@/lib/services/schema-registry.service';
import type { CalculationType } from '@/lib/ai/query-intent';

/**
 * Base system prompt - template-independent instructions
 */
const BASE_SYSTEM_PROMPT = `당신은 정보 조회 시스템의 쿼리 분석 전문가입니다.
사용자의 비정형 한국어 질문을 분석하여 구조화된 검색 의도로 변환합니다.

## 의도 분류 가이드

### 1. direct_lookup (단일 필드 조회)
특정 값을 직접 조회하는 경우
- "○○ 알려줘", "○○ 확인해줘", "내 ○○"

### 2. calculation (계산 필요)
값을 가져와서 계산이 필요한 경우
- "○○까지 얼마 남았어?", "○○ 달성하려면?", "○○ 계산해줘"

### 3. comparison (비교)
두 개 이상의 값을 비교하는 경우
- "○○ 대비", "○○와 비교", "변화", "추이"

### 4. aggregation (집계)
여러 값을 합산, 평균, 카운트하는 경우
- "총 ○○", "○○ 합계", "몇 건이야?", "평균"

### 5. general_qa (일반 질문)
위 카테고리에 해당하지 않는 일반적인 질문
- "○○가 뭐야?", "○○ 규정", "어떻게 하나요?"

## 기간 해석 규칙 (중요!)

**사용자가 명시적으로 기간을 언급한 경우에만 period 필터를 추가합니다.**
기간 언급이 없으면 period 필터를 생략하여 최신 데이터를 검색합니다.

- "이번달", "이달", "현재" → period: 현재 년월 (YYYYMM 형식, 예: 202512)
- "지난달", "전월" → period: 이전 년월 (YYYYMM 형식, 예: 202511)
- "11월", "12월" (연도 없이) → period: 현재 년도 + 해당 월 (YYYYMM 형식, 예: 202511)
- "2025년 11월" → period: 해당 년월 (YYYYMM 형식, 예: 202511)
- "올해" → 연도 필터만 사용, period는 생략
- 기간 언급 없음 → period 필터 생략 (가장 최신 데이터 검색)

## 응답 형식

반드시 아래 JSON 형식으로만 응답하세요. 설명이나 추가 텍스트 없이 JSON만 출력합니다.

\`\`\`json
{
  "intent": "direct_lookup | calculation | comparison | aggregation | general_qa",
  "template": "템플릿_slug",
  "fields": ["필드명1", "필드명2"],
  "calculation": {
    "type": "계산_유형",
    "params": { "파라미터": "값" }
  },
  "filters": {
    "period": "기간",
    "metadataType": "메타데이터_타입",
    "chunkType": "청크_타입",
    "customFilter": "값"
  },
  "semanticSearch": {
    "enabled": true,
    "query": "검색에 최적화된 쿼리",
    "topK": 5
  },
  "confidence": 0.95,
  "extractedEntities": {
    "period": "추출된 기간",
    "amount": 12345678
  }
}
\`\`\`

## 중요 규칙

1. **항상 JSON만 응답**: 설명, 인사, 추가 텍스트 없이 순수 JSON만 출력
2. **confidence 점수**: 확실한 의도는 0.9 이상, 불확실하면 0.5-0.8
3. **semanticSearch.enabled**:
   - direct_lookup + 명확한 필드 → false (메타데이터만으로 충분)
   - calculation + 수치 데이터 → true (관련 컨텍스트 필요)
   - general_qa → true (반드시 시맨틱 검색)
4. **topK 설정**:
   - direct_lookup: 1-3
   - calculation: 3-5
   - comparison: 5-10
   - aggregation: 10-20
   - general_qa: 5-10
5. **filters 최소화**: 필요한 필터만 포함, 불필요한 필터는 생략
6. **template 선택**: 질문 내용에 가장 적합한 템플릿 선택, 불확실하면 "general"`;

/**
 * Build template section from schema
 */
function buildTemplateSection(schema: RagTemplateSchema): string {
  const fields = schema.metadataFields as MetadataFieldDefinition[];
  const calculations = (schema.calculations || []) as CalculationDefinition[];

  let section = `\n### ${schema.displayName} (${schema.templateSlug})`;

  if (schema.description) {
    section += `\n${schema.description}`;
  }

  // Metadata fields
  if (fields.length > 0) {
    section += '\n\n**메타데이터 필드:**';
    for (const field of fields) {
      section += `\n- \`${field.key}\`: ${field.displayName}`;
      if (field.description) {
        section += ` (${field.description})`;
      }
      if (field.aliases?.length) {
        section += ` - 별칭: ${field.aliases.join(', ')}`;
      }
    }
  }

  // Calculations
  if (calculations.length > 0) {
    section += '\n\n**지원 계산:**';
    for (const calc of calculations) {
      section += `\n- \`${calc.type}\`: ${calc.displayName}`;
      if (calc.description) {
        section += ` - ${calc.description}`;
      }
    }
  }

  return section;
}

/**
 * Build examples section from schemas
 */
function buildExamplesSection(schemas: RagTemplateSchema[]): string {
  const examples: ExampleQuery[] = [];

  for (const schema of schemas) {
    if (schema.exampleQueries) {
      examples.push(...(schema.exampleQueries as ExampleQuery[]));
    }
  }

  if (examples.length === 0) {
    return '';
  }

  let section = '\n\n## 질문 예시';

  for (const example of examples.slice(0, 10)) {
    section += `\n- "${example.query}" → intent: ${example.expectedIntent}, template: ${example.expectedTemplate}`;
    if (example.expectedFields?.length) {
      section += `, fields: [${example.expectedFields.join(', ')}]`;
    }
    if (example.expectedCalculation) {
      section += `, calculation: ${example.expectedCalculation}`;
    }
  }

  return section;
}

/**
 * Build the complete dynamic prompt from RAG schemas
 */
export function buildDynamicPrompt(schemas: RagTemplateSchema[]): string {
  let prompt = BASE_SYSTEM_PROMPT;

  // Add available templates section
  prompt += '\n\n## 사용 가능한 데이터 템플릿';

  // Sort by priority
  const sortedSchemas = [...schemas].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const schema of sortedSchemas) {
    if (schema.isActive) {
      prompt += buildTemplateSection(schema);
    }
  }

  // Add examples
  prompt += buildExamplesSection(sortedSchemas);

  return prompt;
}

/**
 * Build the full query understanding prompt with user context
 */
export function buildQueryUnderstandingPrompt(
  userQuery: string,
  schemas: RagTemplateSchema[],
  context?: {
    previousQueries?: string[];
    currentPeriod?: string;
    availableNamespaces?: string[];
  }
): string {
  let prompt = buildDynamicPrompt(schemas);

  // Add current context
  if (context?.currentPeriod) {
    prompt += `\n\n## 현재 기준 정보\n- 현재 기간: ${context.currentPeriod}`;
  }

  if (context?.availableNamespaces?.length) {
    prompt += `\n- 사용 가능한 네임스페이스: ${context.availableNamespaces.join(', ')}`;
  }

  // Add conversation context for follow-up queries
  if (context?.previousQueries?.length) {
    prompt += `\n\n## 이전 대화 맥락\n${context.previousQueries
      .slice(-3)
      .map((q, i) => `${i + 1}. "${q}"`)
      .join('\n')}`;
  }

  // Add the user query
  prompt += `\n\n## 분석할 사용자 질문\n"${userQuery}"`;

  return prompt;
}

/**
 * Build template section from dynamic (discovered) schema
 */
function buildDynamicTemplateSection(schema: DynamicSchema): string {
  let section = `\n### ${getTemplateDisplayName(schema.templateType)} (${schema.templateType})`;
  section += `\n네임스페이스: ${schema.namespace} | 벡터 수: ${schema.vectorCount.toLocaleString()}개`;

  // Fields
  if (schema.fields.length > 0) {
    section += '\n\n**사용 가능한 필드:**';
    for (const field of schema.fields.slice(0, 15)) {
      section += `\n- \`${field.name}\`: ${field.displayName}`;
      if (field.description) {
        section += ` (${field.description})`;
      }
      if (field.examples.length > 0) {
        const exampleStr = field.examples.slice(0, 2).join(', ');
        section += ` [예: ${exampleStr}]`;
      }
    }
  }

  // Calculations
  const availableCalcs = schema.calculations.filter((c) => c.available);
  if (availableCalcs.length > 0) {
    section += '\n\n**지원 계산:**';
    for (const calc of availableCalcs) {
      section += `\n- \`${calc.type}\`: ${calc.name} - ${calc.description}`;
    }
  }

  // Examples
  if (schema.examples.length > 0) {
    section += '\n\n**질문 예시:**';
    for (const example of schema.examples) {
      section += `\n- "${example}"`;
    }
  }

  return section;
}

/**
 * Get display name for template type
 */
function getTemplateDisplayName(templateType: string): string {
  const names: Record<string, string> = {
    compensation: '급여/수수료',
    mdrt: 'MDRT 실적',
    general: '일반 정보',
    schedule: '일정',
    policy: '정책/규정',
  };
  return names[templateType] || templateType;
}

/**
 * Build prompt from dynamically discovered schemas
 */
export function buildPromptFromDynamicSchemas(schemas: DynamicSchema[]): string {
  if (schemas.length === 0) {
    return FALLBACK_STATIC_PROMPT;
  }

  let prompt = BASE_SYSTEM_PROMPT;

  // Add data availability notice
  prompt += '\n\n## 현재 사용 가능한 데이터';
  prompt += '\n아래는 현재 시스템에 업로드된 실제 데이터 구조입니다. 이 정보를 기반으로 사용자의 질문을 분석하세요.';

  // Sort by vector count (most data first)
  const sortedSchemas = [...schemas].sort((a, b) => b.vectorCount - a.vectorCount);

  for (const schema of sortedSchemas) {
    prompt += buildDynamicTemplateSection(schema);
  }

  // Add template selection guidance
  prompt += '\n\n## 템플릿 선택 가이드';
  const availableTemplates = sortedSchemas.map((s) => s.templateType);
  prompt += `\n사용 가능한 템플릿: ${availableTemplates.join(', ')}`;
  prompt += '\n질문의 주제에 가장 적합한 템플릿을 선택하세요.';
  prompt += '\n데이터가 없는 주제에 대한 질문이면 confidence를 0.3 이하로 설정하세요.';

  return prompt;
}

/**
 * Build the full query understanding prompt with dynamic schemas
 */
export function buildDynamicQueryUnderstandingPrompt(
  userQuery: string,
  dynamicSchemas: DynamicSchema[],
  context?: {
    previousQueries?: string[];
    currentPeriod?: string;
    confirmedContext?: {
      period?: string;
      templateType?: string;
    };
    sessionId?: string;
  }
): string {
  let prompt = buildPromptFromDynamicSchemas(dynamicSchemas);

  // Add current context
  prompt += '\n\n## 현재 컨텍스트';

  const now = new Date();
  const currentPeriod = context?.currentPeriod ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  prompt += `\n- 현재 기간: ${currentPeriod}`;
  prompt += `\n- 현재 날짜: ${now.toISOString().split('T')[0]}`;

  // Add confirmed context from previous clarification
  if (context?.confirmedContext) {
    if (context.confirmedContext.period) {
      prompt += `\n- 확인된 기간: ${context.confirmedContext.period}`;
    }
    if (context.confirmedContext.templateType) {
      prompt += `\n- 확인된 템플릿: ${context.confirmedContext.templateType}`;
    }
  }

  // Add conversation context for follow-up queries
  if (context?.previousQueries?.length) {
    prompt += `\n\n## 이전 대화 맥락\n${context.previousQueries
      .slice(-3)
      .map((q, i) => `${i + 1}. "${q}"`)
      .join('\n')}`;
    prompt += '\n이전 대화의 맥락을 고려하여 의도를 파악하세요.';
  }

  // Add the user query
  prompt += `\n\n## 분석할 사용자 질문\n"${userQuery}"`;

  return prompt;
}

/**
 * Merge database schemas with dynamic schemas
 * Dynamic schemas take precedence if they have more recent data
 */
export function mergeSchemas(
  dbSchemas: RagTemplateSchema[],
  dynamicSchemas: DynamicSchema[]
): DynamicSchema[] {
  const merged: Map<string, DynamicSchema> = new Map();

  // Add dynamic schemas first (they have actual data)
  for (const schema of dynamicSchemas) {
    merged.set(schema.templateType, schema);
  }

  // Enhance with DB schema information where available
  for (const dbSchema of dbSchemas) {
    const existing = merged.get(dbSchema.templateSlug);

    if (existing) {
      // Merge examples from DB schema
      const dbExamples = (dbSchema.exampleQueries as ExampleQuery[] || []).map((e) => e.query);
      existing.examples = [...new Set([...existing.examples, ...dbExamples])].slice(0, 10);
    } else if (dbSchema.isActive) {
      // Convert DB schema to DynamicSchema format
      const fields = (dbSchema.metadataFields as MetadataFieldDefinition[] || []);
      const calculations = (dbSchema.calculations as CalculationDefinition[] || []);

      merged.set(dbSchema.templateSlug, {
        templateType: dbSchema.templateSlug,
        namespace: 'db_schema',
        fields: fields.map((f) => ({
          name: f.key,
          type: f.type as DiscoveredField['type'],
          description: f.description || '',
          displayName: f.displayName,
          examples: [],
          frequency: 1,
        })),
        calculations: calculations.map((c) => ({
          type: c.type as CalculationType,
          name: c.displayName,
          description: c.description || '',
          requiredFields: c.requiredFields || [],
          available: true,
        })),
        examples: ((dbSchema.exampleQueries as ExampleQuery[] || []).map((e) => e.query)).slice(0, 5),
        vectorCount: 0,
        lastUpdated: new Date(),
        lastDiscoveredAt: new Date(),
      });
    }
  }

  return Array.from(merged.values());
}

/**
 * Build prompt optimized for low-confidence clarification
 */
export function buildClarificationPrompt(
  userQuery: string,
  partialIntent: Record<string, unknown>,
  missingContext: string[]
): string {
  return `사용자의 질문을 명확히 하기 위한 분석이 필요합니다.

## 원래 질문
"${userQuery}"

## 현재까지 파악된 의도
${JSON.stringify(partialIntent, null, 2)}

## 누락된 정보
${missingContext.map((c) => `- ${c}`).join('\n')}

위 정보를 바탕으로, 사용자에게 어떤 추가 정보를 요청해야 하는지 판단하세요.

응답 형식:
\`\`\`json
{
  "clarificationNeeded": true,
  "clarificationType": "period | template | field | general",
  "suggestedQuestion": "사용자에게 물어볼 질문",
  "options": ["옵션1", "옵션2", "옵션3"]
}
\`\`\``;
}

/**
 * Fallback static prompt for when no schemas are available
 */
export const FALLBACK_STATIC_PROMPT = `당신은 정보 조회 시스템의 쿼리 분석 전문가입니다.
사용자의 비정형 한국어 질문을 분석하여 구조화된 검색 의도로 변환합니다.

사용 가능한 스키마 정보가 없습니다. 일반적인 분석을 수행합니다.

## 의도 분류

1. **direct_lookup**: 단일 값 조회 ("○○ 알려줘")
2. **calculation**: 계산 필요 ("○○까지 얼마?")
3. **comparison**: 비교 ("○○ 대비")
4. **aggregation**: 집계 ("총 ○○", "몇 건")
5. **general_qa**: 일반 질문 ("○○가 뭐야?")

## 응답 형식

JSON만 응답:
\`\`\`json
{
  "intent": "general_qa",
  "template": "general",
  "fields": [],
  "filters": {},
  "semanticSearch": { "enabled": true, "query": "검색어", "topK": 5 },
  "confidence": 0.5
}
\`\`\``;

/**
 * Default RAG schemas for bootstrapping
 * These will be inserted into the database on first run
 */
export const DEFAULT_RAG_SCHEMAS: Omit<RagTemplateSchema, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    templateId: null,
    templateSlug: 'compensation',
    displayName: '급여 명세',
    description: '설계사의 월별 급여 상세 내역 (커미션, 오버라이드, 시책금, 환수금 등)',
    metadataFields: [
      { key: 'finalPayment', displayName: '최종지급액', type: 'number', description: '실수령액 (세후)', isSearchable: true, isFilterable: true, isComputable: true, unit: 'KRW', aliases: ['실수령액', '월급', '급여'] },
      { key: 'totalCommission', displayName: '총 커미션', type: 'number', description: '수수료 합계', isSearchable: true, isFilterable: true, isComputable: true, unit: 'KRW', aliases: ['수수료', '커미션'] },
      { key: 'totalOverride', displayName: '총 오버라이드', type: 'number', description: '팀/조직 수당', isSearchable: true, isFilterable: true, isComputable: true, unit: 'KRW', aliases: ['OR', '오알'] },
      { key: 'totalIncentive', displayName: '총 시책금', type: 'number', description: '인센티브', isSearchable: true, isFilterable: true, isComputable: true, unit: 'KRW', aliases: ['시책', '인센티브'] },
      { key: 'totalClawback', displayName: '총 환수금', type: 'number', description: '마이너스 금액', isSearchable: true, isFilterable: true, isComputable: true, unit: 'KRW', aliases: ['환수', '차감'] },
      { key: 'contractCount', displayName: '계약 건수', type: 'number', isSearchable: false, isFilterable: true, isComputable: true, aliases: ['계약수', '건수'] },
      { key: 'period', displayName: '기간', type: 'string', description: 'YYYY-MM 형식', isSearchable: false, isFilterable: true, isComputable: false },
    ],
    chunkTypes: [
      { type: 'summary', displayName: '월별 요약', description: '급여 요약 정보', typicalUseCase: '전체 현황 파악' },
      { type: 'commission_detail', displayName: '건별 수수료', description: '개별 계약별 수수료', typicalUseCase: '특정 계약 조회' },
      { type: 'override_detail', displayName: '오버라이드 상세', description: '팀 수당 내역', typicalUseCase: '팀 실적 관련 질문' },
    ],
    supportedIntents: [
      { intent: 'direct_lookup', isSupported: true, preferredChunkTypes: ['summary'], defaultTopK: 3 },
      { intent: 'calculation', isSupported: true, preferredChunkTypes: ['summary'], defaultTopK: 5 },
      { intent: 'comparison', isSupported: true, defaultTopK: 10 },
      { intent: 'aggregation', isSupported: true, defaultTopK: 20 },
      { intent: 'general_qa', isSupported: false, defaultTopK: 5 },
    ],
    calculations: [
      { type: 'tax_reverse', displayName: '세전 금액 계산', description: '실수령액에서 세전 금액 역산', formula: 'finalPayment / (1 - taxRate)', requiredFields: ['finalPayment'], resultFormat: 'currency' },
      { type: 'period_diff', displayName: '기간 비교', description: '두 기간 간의 차이 계산', formula: 'period2 - period1', requiredFields: ['totalCommission'], parameters: [{ name: 'periods', type: 'array', description: '비교할 기간들' }], resultFormat: 'currency' },
    ],
    exampleQueries: [
      { query: '이번달 실수령액 알려줘', expectedIntent: 'direct_lookup', expectedTemplate: 'compensation', expectedFields: ['finalPayment'] },
      { query: '지난달 대비 커미션 변화', expectedIntent: 'comparison', expectedTemplate: 'compensation', expectedFields: ['totalCommission'], expectedCalculation: 'period_diff' },
      { query: '올해 총 커미션', expectedIntent: 'aggregation', expectedTemplate: 'compensation', expectedFields: ['totalCommission'] },
    ],
    priority: 10,
    isActive: true,
  },
  {
    templateId: null,
    templateSlug: 'mdrt',
    displayName: 'MDRT 실적',
    description: 'MDRT/COT/TOT 달성을 위한 실적 추적 데이터',
    metadataFields: [
      { key: 'totalCommission', displayName: '누적 커미션', type: 'number', description: 'FYC 기준', isSearchable: true, isFilterable: true, isComputable: true, unit: 'KRW', aliases: ['FYC', '커미션'] },
      { key: 'totalIncome', displayName: '누적 소득', type: 'number', description: 'AGI 기준', isSearchable: true, isFilterable: true, isComputable: true, unit: 'KRW', aliases: ['AGI', '소득'] },
      { key: 'fycMdrtStatus', displayName: 'FYC MDRT 상태', type: 'string', description: 'none/on-pace/mdrt/cot/tot', isSearchable: true, isFilterable: true, isComputable: false },
      { key: 'fycMdrtProgress', displayName: 'FYC MDRT 진행률', type: 'number', description: '0-100+%', isSearchable: false, isFilterable: true, isComputable: true, unit: '%' },
      { key: 'agiMdrtStatus', displayName: 'AGI MDRT 상태', type: 'string', isSearchable: true, isFilterable: true, isComputable: false },
      { key: 'agiMdrtProgress', displayName: 'AGI MDRT 진행률', type: 'number', unit: '%', isSearchable: false, isFilterable: true, isComputable: true },
      { key: 'monthlyCommissions', displayName: '월별 커미션', type: 'json', isSearchable: false, isFilterable: false, isComputable: true },
    ],
    chunkTypes: [
      { type: 'summary', displayName: 'MDRT 현황 요약', description: '달성 현황 및 진행률', typicalUseCase: 'MDRT 관련 질문' },
      { type: 'monthly_detail', displayName: '월별 실적 상세', description: '월별 커미션/소득 추이', typicalUseCase: '추이 분석' },
    ],
    supportedIntents: [
      { intent: 'direct_lookup', isSupported: true, preferredChunkTypes: ['summary'], defaultTopK: 3 },
      { intent: 'calculation', isSupported: true, preferredChunkTypes: ['summary'], defaultTopK: 5 },
      { intent: 'comparison', isSupported: true, defaultTopK: 10 },
      { intent: 'aggregation', isSupported: false, defaultTopK: 5 },
      { intent: 'general_qa', isSupported: true, defaultTopK: 5 },
    ],
    calculations: [
      {
        type: 'mdrt_gap',
        displayName: 'MDRT 달성까지 남은 금액',
        description: 'MDRT/COT/TOT 달성까지 남은 금액 계산',
        formula: 'MDRT_STANDARD - totalCommission',
        requiredFields: ['totalCommission'],
        parameters: [
          { name: 'standard', type: 'string', description: 'MDRT 기준', defaultValue: 'fycMdrt', options: [{ value: 'fycMdrt', label: 'FYC MDRT' }, { value: 'fycCot', label: 'FYC COT' }, { value: 'fycTot', label: 'FYC TOT' }, { value: 'agiMdrt', label: 'AGI MDRT' }] },
        ],
        resultFormat: 'currency',
      },
    ],
    exampleQueries: [
      { query: 'MDRT까지 얼마 남았어?', expectedIntent: 'calculation', expectedTemplate: 'mdrt', expectedFields: ['totalCommission', 'fycMdrtProgress'], expectedCalculation: 'mdrt_gap' },
      { query: 'COT 달성하려면 얼마 더 해야해?', expectedIntent: 'calculation', expectedTemplate: 'mdrt', expectedCalculation: 'mdrt_gap' },
      { query: 'MDRT 진행률 확인', expectedIntent: 'direct_lookup', expectedTemplate: 'mdrt', expectedFields: ['fycMdrtProgress'] },
      { query: 'MDRT가 뭐야?', expectedIntent: 'general_qa', expectedTemplate: 'mdrt' },
    ],
    priority: 9,
    isActive: true,
  },
  {
    templateId: null,
    templateSlug: 'general',
    displayName: '일반 문서',
    description: '회사 정책, 규정, 교육 자료 등',
    metadataFields: [
      { key: 'documentType', displayName: '문서 유형', type: 'string', isSearchable: true, isFilterable: true, isComputable: false },
      { key: 'category', displayName: '카테고리', type: 'string', isSearchable: true, isFilterable: true, isComputable: false },
    ],
    chunkTypes: [
      { type: 'text', displayName: '텍스트', description: '일반 텍스트 청크', typicalUseCase: '일반 질문' },
    ],
    supportedIntents: [
      { intent: 'direct_lookup', isSupported: false, defaultTopK: 5 },
      { intent: 'calculation', isSupported: false, defaultTopK: 5 },
      { intent: 'comparison', isSupported: false, defaultTopK: 5 },
      { intent: 'aggregation', isSupported: false, defaultTopK: 5 },
      { intent: 'general_qa', isSupported: true, defaultTopK: 10 },
    ],
    calculations: [],
    exampleQueries: [
      { query: '오버라이드 계산 방식', expectedIntent: 'general_qa', expectedTemplate: 'general' },
      { query: '환수 규정 알려줘', expectedIntent: 'general_qa', expectedTemplate: 'general' },
    ],
    priority: 1,
    isActive: true,
  },
];
