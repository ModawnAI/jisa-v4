# RAG System 100% Accuracy Implementation Plan

## Executive Summary

Current RAG test accuracy: **46.9% (15/32 tests)**
Target: **100% accuracy**

This document outlines a comprehensive plan to fix the RAG pipeline failures for employee J00307 and achieve 100% accuracy across all query types.

---

## Root Cause Analysis

### Critical Issue #1: Period Format Mismatch

**Problem**: Query understanding normalizes "이번달" to `YYYY-MM` format (e.g., "2025-12"), but the compensation processor stores `closingMonth` in `YYYYMM` format (e.g., "202509").

**Evidence from test logs**:
```
[Enhanced RAG] Filters: {"period":"2025-12"}
[Enhanced RAG] No results with filters, retrying without...
```

**Location**:
- `lib/services/query-understanding.service.ts:247-286` - `normalizePeriod()` returns "YYYY-MM"
- `lib/services/document-processors/compensation-excel-processor.ts:566` - stores "YYYYMM"

### Critical Issue #2: Metadata Field Name Mismatch

**Problem**: RAG service filters by `period` field, but processor stores data as `closingMonth`.

**Evidence**:
- `enhanced-rag.service.ts:682`: `{ period: { $eq: intent.filters.period } }`
- `compensation-excel-processor.ts:566`: `closingMonth: employee.closingMonth`

### Critical Issue #3: Employee ID Type Mismatch

**Problem**: RAG filters use database UUID, but processor stores 사번 (employee number like "J00307").

**Evidence from test**:
```
Database ID: e4786a17-24f1-4510-85e3-be2fa8a74c1d
Namespace: emp_J00307
```

- `enhanced-rag.service.ts:679`: `{ employeeId: { $eq: context.employeeId } }` (uses UUID)
- `compensation-excel-processor.ts:544`: `employeeId: sabon` (stores "J00307")

### Critical Issue #4: Low Embedding Relevance Scores

**Problem**: Semantic search returns low relevance scores (0.27-0.48) near the threshold of 0.35, causing:
- Low confidence responses
- Fallback to "정확한 정보를 찾기 어렵습니다"
- Wrong data being returned (447,592원 instead of -180,653원)

---

## Implementation Plan

### Phase 1: Metadata Standardization (CRITICAL - Day 1)

#### 1.1 Standardize Period Format

Create a unified period utility:

```typescript
// lib/utils/period.ts
export const PERIOD_FORMAT = 'YYYYMM'; // Single source of truth

export function normalizePeriod(input: string): string {
  // Convert any format to YYYYMM
  const cleaned = input.replace(/[-\/]/g, '');

  // Handle relative periods
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  switch (input.toLowerCase()) {
    case 'latest':
    case '이번달':
    case '현재':
      return `${year}${String(month).padStart(2, '0')}`;
    case 'previous':
    case '지난달':
    case '전월':
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      return `${prevYear}${String(prevMonth).padStart(2, '0')}`;
    default:
      // YYYY-MM -> YYYYMM
      if (/^\d{4}-\d{2}$/.test(input)) {
        return input.replace('-', '');
      }
      return cleaned;
  }
}

export function formatPeriodForDisplay(period: string): string {
  // YYYYMM -> YYYY년 MM월
  const year = period.substring(0, 4);
  const month = period.substring(4, 6);
  return `${year}년 ${parseInt(month)}월`;
}
```

#### 1.2 Align Metadata Field Names

Update compensation processor to use standardized field names:

```typescript
// compensation-excel-processor.ts - Line 542-567
const metadata: EmployeeVectorMetadata = {
  ...this.createBaseMetadata(document, options, chunkIndex, embeddingText, 'excel'),

  // Employee identifiers (store BOTH for flexibility)
  employeeId: sabon,           // Primary: J00307
  employeeNumber: sabon,       // Alias for clarity
  dbEmployeeId: options.dbEmployeeId, // Database UUID if available

  employeeName: employee.profile.name,
  jobType: employee.profile.jobType,
  department: employee.profile.department,

  // Period (standardized)
  period: employee.closingMonth,    // ADD THIS - matches filter field name
  closingMonth: employee.closingMonth, // Keep for backwards compatibility

  // Financial summary
  finalPayment: employee.summaryFinancials.finalPayment,
  totalCommission: employee.calculatedFinancials.totalCommission,
  // ... rest of fields
};
```

#### 1.3 Fix RAG Service Filter Building

```typescript
// enhanced-rag.service.ts - Line 671-720
private buildPineconeFilters(
  intent: QueryIntent,
  context: EnhancedRAGContext
): Record<string, unknown> {
  const andConditions: Record<string, unknown>[] = [];

  // Filter by employee number (사번), NOT database UUID
  // The namespace already isolates by employee, but this double-checks
  if (context.employeeNumber) {
    andConditions.push({ employeeId: { $eq: context.employeeNumber } });
  }

  // Period filter - use standardized YYYYMM format
  if (intent.filters.period) {
    const normalizedPeriod = normalizePeriod(intent.filters.period);
    andConditions.push({ period: { $eq: normalizedPeriod } });
  }

  // ... rest of filters
}
```

### Phase 2: Context Enhancement (Day 1-2)

#### 2.1 Update EnhancedRAGContext Interface

```typescript
// lib/services/enhanced-rag.service.ts
export interface EnhancedRAGContext {
  employeeId: string;          // Database UUID (for DB lookups)
  employeeNumber: string;      // 사번 like J00307 (for Pinecone filters)
  organizationId: string;
  namespace: string;           // emp_J00307
  sessionId?: string;
  clearanceLevel: 'basic' | 'standard' | 'advanced';
  currentPeriod?: string;      // YYYYMM format
}
```

#### 2.2 Update Chat API Route

```typescript
// app/api/chat/route.ts
const ragContext: EnhancedRAGContext = {
  employeeId: employee.id,           // UUID for DB
  employeeNumber: employee.employeeId, // J00307 for Pinecone
  organizationId: 'default',
  namespace: `emp_${employee.employeeId}`, // emp_J00307
  sessionId: sessionId,
  clearanceLevel: 'advanced',
  currentPeriod: getCurrentPeriod(),  // Helper returns YYYYMM
};
```

### Phase 3: Embedding Text Optimization (Day 2)

#### 3.1 Restructure Embedding Text for Better Semantic Search

The current embedding text structure is good but can be improved for query matching:

```typescript
// compensation-excel-processor.ts - generateEmbeddingText()
private generateEmbeddingText(employee: EmployeeData): string {
  const parts: string[] = [];

  // Header with Korean semantic anchors
  parts.push(`[보상명세서] ${this.formatPeriodForDisplay(employee.closingMonth)} 마감`);
  parts.push(`사번: ${employee.sabon} | 성명: ${employee.profile.name}`);
  parts.push('');

  // Financial summary with explicit field labels for better matching
  parts.push('## 급여 및 수수료 요약');
  parts.push(`최종지급액(급여): ${this.formatKRW(employee.summaryFinancials.finalPayment)}`);
  parts.push(`커미션계(총커미션): ${this.formatKRW(employee.summaryFinancials.commissionTotal)}`);
  parts.push(`FC커미션계: ${this.formatKRW(employee.summaryFinancials.fcCommissionTotal)}`);
  parts.push(`오버라이드계(총오버라이드): ${this.formatKRW(employee.calculatedFinancials.totalOverride)}`);
  parts.push(`환수금액(총환수): ${this.formatKRW(employee.calculatedFinancials.totalClawback)}`);
  parts.push('');

  // Contract summary with query-friendly terms
  parts.push('## 계약 현황');
  parts.push(`계약건수(총계약수): ${employee.calculatedFinancials.contractCount}건`);
  parts.push(`총보험료: ${this.formatKRW(employee.calculatedFinancials.totalPremium)}`);
  parts.push(`총MFYC: ${this.formatKRW(employee.calculatedFinancials.totalMFYC)}`);

  // Add synonyms for better semantic matching
  parts.push('');
  parts.push('[키워드: 수수료, 커미션, 급여, 월급, 지급액, 소득, 실적, 계약, 보험, 환수]');

  return parts.join('\n');
}
```

#### 3.2 Add Query Semantic Enrichment

```typescript
// lib/services/query-understanding.service.ts
private enrichQueryForEmbedding(query: string, intent: QueryIntent): string {
  // Add domain-specific terms to improve embedding similarity
  const enrichments: string[] = [query];

  if (intent.template === 'compensation') {
    if (query.includes('수수료') || query.includes('커미션')) {
      enrichments.push('보상명세서 커미션 수수료 급여');
    }
    if (query.includes('지급') || query.includes('급여')) {
      enrichments.push('최종지급액 급여 월급 수령액');
    }
    if (query.includes('환수')) {
      enrichments.push('환수금액 환수 클로백');
    }
  }

  return enrichments.join(' ');
}
```

### Phase 4: Direct Data Lookup (Day 2-3)

#### 4.1 Hybrid Retrieval Strategy

For high-confidence queries about specific fields, bypass semantic search:

```typescript
// lib/services/enhanced-rag.service.ts
private async hybridRetrieval(
  intent: QueryIntent,
  context: EnhancedRAGContext
): Promise<SearchResult[]> {
  // High-confidence direct lookups should use metadata filtering only
  if (intent.confidence > 0.9 && intent.intent === 'direct_lookup') {
    const directResults = await this.directMetadataLookup(intent, context);
    if (directResults.length > 0) {
      return directResults;
    }
  }

  // Fall back to semantic search
  return this.semanticSearch(intent, context);
}

private async directMetadataLookup(
  intent: QueryIntent,
  context: EnhancedRAGContext
): Promise<SearchResult[]> {
  const index = this.pinecone.Index(this.indexName);
  const ns = index.namespace(context.namespace);

  // Query with only metadata filters (no vector)
  const filters = this.buildPineconeFilters(intent, context);

  // Use a neutral query vector
  const results = await ns.query({
    vector: await this.getQueryEmbedding('보상명세서 수수료 급여'),
    topK: 5,
    filter: filters,
    includeMetadata: true,
  });

  return this.processResults(results);
}
```

### Phase 5: Response Generation Improvement (Day 3)

#### 5.1 Structured Field Extraction

```typescript
// lib/services/enhanced-rag.service.ts
private extractFieldsFromMetadata(
  results: SearchResult[],
  requestedFields: string[]
): Record<string, number | string> {
  const extracted: Record<string, number | string> = {};

  for (const result of results) {
    const meta = result.metadata as Record<string, unknown>;

    for (const field of requestedFields) {
      // Map query fields to metadata fields
      const mappings: Record<string, string[]> = {
        'finalPayment': ['finalPayment', 'finalPaymentAmount', '최종지급액'],
        'totalCommission': ['totalCommission', 'commissionTotal', '커미션계'],
        'fcCommission': ['fcCommission', 'fcCommissionTotal', 'FC커미션계'],
        'totalOverride': ['totalOverride', '오버라이드계'],
        'contractCount': ['contractCount', '계약건수'],
        'totalClawback': ['totalClawback', '환수금액'],
      };

      const aliases = mappings[field] || [field];
      for (const alias of aliases) {
        if (meta[alias] !== undefined) {
          extracted[field] = meta[alias] as number | string;
          break;
        }
      }
    }
  }

  return extracted;
}
```

#### 5.2 Template-Based Response Generation

```typescript
// lib/utils/response-formatter.ts
export function formatCompensationResponse(
  fields: Record<string, number | string>,
  intent: QueryIntent,
  period: string
): string {
  const periodDisplay = formatPeriodForDisplay(period);

  // Direct value responses
  if (intent.fields.includes('finalPayment') && fields.finalPayment !== undefined) {
    const value = fields.finalPayment as number;
    return `${periodDisplay} 최종지급액은 ${formatKRW(value)}입니다.`;
  }

  if (intent.fields.includes('totalCommission') && fields.totalCommission !== undefined) {
    const value = fields.totalCommission as number;
    return `${periodDisplay} 커미션계는 ${formatKRW(value)}입니다.`;
  }

  // ... other field patterns

  // Comprehensive response
  const parts: string[] = [`${periodDisplay} 보상 명세입니다.`];

  if (fields.finalPayment !== undefined) {
    parts.push(`- 최종지급액: ${formatKRW(fields.finalPayment as number)}`);
  }
  if (fields.totalCommission !== undefined) {
    parts.push(`- 커미션계: ${formatKRW(fields.totalCommission as number)}`);
  }
  // ... other fields

  return parts.join('\n');
}
```

### Phase 6: Re-processing Existing Data (Day 3-4)

#### 6.1 Migration Script

```typescript
// scripts/migrate-vector-metadata.ts
async function migrateVectorMetadata() {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pc.index(process.env.PINECONE_INDEX!);

  // Get all namespaces starting with emp_
  const stats = await index.describeIndexStats();
  const namespaces = Object.keys(stats.namespaces || {})
    .filter(ns => ns.startsWith('emp_'));

  for (const namespace of namespaces) {
    console.log(`Migrating namespace: ${namespace}`);
    const ns = index.namespace(namespace);

    // Fetch all vectors
    const queryResult = await ns.query({
      vector: new Array(3072).fill(0.1),
      topK: 100,
      includeMetadata: true,
      includeValues: true,
    });

    // Update metadata
    const updates = queryResult.matches?.map(match => ({
      id: match.id,
      metadata: {
        ...match.metadata,
        // Add period field from closingMonth
        period: (match.metadata as Record<string, unknown>).closingMonth,
        // Ensure employeeNumber is set
        employeeNumber: (match.metadata as Record<string, unknown>).employeeId,
      },
    }));

    if (updates && updates.length > 0) {
      await ns.update(updates);
      console.log(`  Updated ${updates.length} vectors`);
    }
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/services/period-utils.test.ts
describe('normalizePeriod', () => {
  it('should convert YYYY-MM to YYYYMM', () => {
    expect(normalizePeriod('2025-09')).toBe('202509');
  });

  it('should handle 이번달', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    expect(normalizePeriod('이번달')).toBe(expected);
  });
});
```

### Integration Tests

```typescript
// tests/integration/rag-accuracy.test.ts
describe('RAG Compensation Queries', () => {
  const testCases = [
    {
      query: '내 수수료 알려줘',
      expectedFields: ['totalCommission'],
      expectedValue: -180653,
    },
    {
      query: '최종지급액은?',
      expectedFields: ['finalPayment'],
      expectedValue: -180653,
    },
    // ... all 32 test cases
  ];

  for (const testCase of testCases) {
    it(`should return correct value for: ${testCase.query}`, async () => {
      const result = await enhancedRAGService.query(testCase.query, context);
      expect(result.answer).toContain(testCase.expectedValue.toLocaleString());
    });
  }
});
```

---

## Implementation Checklist

### Day 1: Critical Fixes
- [ ] Create `lib/utils/period.ts` with standardized period handling
- [ ] Update `compensation-excel-processor.ts` to add `period` field
- [ ] Update `enhanced-rag.service.ts` filter building
- [ ] Update `EnhancedRAGContext` interface
- [ ] Update chat API route with `employeeNumber`

### Day 2: Embedding Optimization
- [ ] Restructure embedding text generation
- [ ] Add query semantic enrichment
- [ ] Implement hybrid retrieval strategy
- [ ] Update query understanding service

### Day 3: Response Generation
- [ ] Implement structured field extraction
- [ ] Create template-based response formatter
- [ ] Add field mapping aliases

### Day 4: Migration & Testing
- [ ] Write and run migration script for existing vectors
- [ ] Re-process compensation Excel files
- [ ] Run full test suite
- [ ] Fix any remaining failures

---

## Success Criteria

1. **Period Handling**: Queries with "이번달", "9월", "지난달" correctly match stored data
2. **Employee Filtering**: Namespace + employeeId filter returns correct employee data
3. **Field Retrieval**: All 8 key financial fields are correctly extracted
4. **Response Accuracy**: 100% of test queries return correct values
5. **Response Quality**: Values are formatted correctly in Korean (원, 건)

---

## Appendix: Ground Truth Data for J00307

```typescript
const GROUND_TRUTH = {
  employee: {
    사번: 'J00307',
    사원명: '정다운',
    마감월: '202509',
    소속: '윤나래(7)',
  },
  compensation: {
    커미션계: -180653,
    FC커미션계: 5264,
    오버라이드계: 0,
    과세계: 0,
    공제계: 0,
    소득세: 0,
    주민세: 0,
    최종지급액: -180653,
  },
  contracts: {
    총계약건수: 4,
    총보험료: 105970,
    총MFYC: 29094,
    총지급수수료: 5264,
  },
  mdrt: {
    총수입: 1368110,
  },
};
```
