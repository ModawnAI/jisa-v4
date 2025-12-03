# Phase 9: Pinecone Integration

**Duration**: 3 days
**Dependencies**: Phase 8 complete
**Deliverables**: Complete Pinecone service with dual namespace strategy

---

## Task 9.1: Pinecone Setup

### 9.1.1 Install Dependencies

```bash
npm install @pinecone-database/pinecone
```

### 9.1.2 Pinecone Client Configuration

**File**: `lib/pinecone/client.ts`

```typescript
import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pineconeClient;
}

export function getIndex() {
  const client = getPineconeClient();
  return client.index(process.env.PINECONE_INDEX_NAME!);
}
```

### Tests for 9.1
- [ ] Client initialization
- [ ] Index connection

---

## Task 9.2: Pinecone Service

### 9.2.1 Main Pinecone Service

**File**: `lib/services/pinecone.service.ts`

```typescript
import { getIndex } from '@/lib/pinecone/client';
import { createEmbedding } from '@/lib/utils/embedding';
import type { RecordMetadata } from '@pinecone-database/pinecone';

export interface VectorRecord {
  id: string;
  values: number[];
  metadata?: RecordMetadata;
}

export interface QueryOptions {
  topK?: number;
  includeMetadata?: boolean;
  filter?: Record<string, any>;
}

export interface QueryResult {
  id: string;
  score: number;
  metadata?: RecordMetadata;
}

export class PineconeService {
  private index = getIndex();

  /**
   * Upsert vectors to a namespace
   */
  async upsertVectors(namespace: string, vectors: VectorRecord[]): Promise<void> {
    const ns = this.index.namespace(namespace);

    // Batch upsert in chunks of 100
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await ns.upsert(batch);
    }
  }

  /**
   * Query vectors in a namespace
   */
  async query(
    namespace: string,
    queryText: string,
    options: QueryOptions = {}
  ): Promise<QueryResult[]> {
    const { topK = 10, includeMetadata = true, filter } = options;

    // Create embedding for query
    const queryEmbedding = await createEmbedding(queryText);

    const ns = this.index.namespace(namespace);
    const results = await ns.query({
      vector: queryEmbedding,
      topK,
      includeMetadata,
      filter,
    });

    return results.matches?.map((match) => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata,
    })) || [];
  }

  /**
   * Query across multiple namespaces
   */
  async queryMultiple(
    namespaces: string[],
    queryText: string,
    options: QueryOptions = {}
  ): Promise<{ namespace: string; results: QueryResult[] }[]> {
    const queryEmbedding = await createEmbedding(queryText);

    const queries = namespaces.map(async (namespace) => {
      const ns = this.index.namespace(namespace);
      const results = await ns.query({
        vector: queryEmbedding,
        topK: options.topK || 10,
        includeMetadata: options.includeMetadata ?? true,
        filter: options.filter,
      });

      return {
        namespace,
        results: results.matches?.map((match) => ({
          id: match.id,
          score: match.score || 0,
          metadata: match.metadata,
        })) || [],
      };
    });

    return Promise.all(queries);
  }

  /**
   * Delete vectors from a namespace
   */
  async deleteVectors(namespace: string, vectorIds: string[]): Promise<void> {
    const ns = this.index.namespace(namespace);

    // Batch delete in chunks of 1000
    const batchSize = 1000;
    for (let i = 0; i < vectorIds.length; i += batchSize) {
      const batch = vectorIds.slice(i, i + batchSize);
      await ns.deleteMany(batch);
    }
  }

  /**
   * Delete all vectors in a namespace
   */
  async deleteNamespace(namespace: string): Promise<void> {
    const ns = this.index.namespace(namespace);
    await ns.deleteAll();
  }

  /**
   * Check if a vector with given content hash exists
   */
  async checkDuplicate(namespace: string, contentHash: string): Promise<boolean> {
    const ns = this.index.namespace(namespace);
    const results = await ns.query({
      vector: new Array(3072).fill(0), // Dummy vector for metadata-only query
      topK: 1,
      includeMetadata: true,
      filter: { contentHash: { $eq: contentHash } },
    });

    return (results.matches?.length ?? 0) > 0;
  }

  /**
   * Get namespace statistics
   */
  async getNamespaceStats(namespace: string): Promise<{
    vectorCount: number;
  }> {
    const stats = await this.index.describeIndexStats();
    const nsStats = stats.namespaces?.[namespace];

    return {
      vectorCount: nsStats?.recordCount || 0,
    };
  }

  /**
   * Fetch vectors by IDs
   */
  async fetchVectors(namespace: string, ids: string[]): Promise<VectorRecord[]> {
    const ns = this.index.namespace(namespace);
    const response = await ns.fetch(ids);

    return Object.entries(response.records || {}).map(([id, record]) => ({
      id,
      values: record.values,
      metadata: record.metadata,
    }));
  }
}

export const pineconeService = new PineconeService();
```

### Tests for 9.2
- [ ] Upsert vectors
- [ ] Query single namespace
- [ ] Query multiple namespaces
- [ ] Delete vectors
- [ ] Duplicate check
- [ ] Namespace stats

---

## Task 9.3: Embedding Service

### 9.3.1 OpenAI Embedding Utility

**File**: `lib/utils/embedding.ts`

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = 'text-embedding-3-large';
const EMBEDDING_DIMENSION = 3072;

/**
 * Create embedding for a single text
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSION,
  });

  return response.data[0].embedding;
}

/**
 * Create embeddings for multiple texts (batched)
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSION,
  });

  return response.data.map((d) => d.embedding);
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

### Tests for 9.3
- [ ] Single embedding creation
- [ ] Batch embedding creation
- [ ] Cosine similarity calculation

---

## Task 9.4: Dual Namespace Strategy Implementation

### 9.4.1 Namespace Manager

**File**: `lib/services/namespace.service.ts`

```typescript
import { pineconeService } from './pinecone.service';
import { db } from '@/lib/db';
import { employees, organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface NamespaceInfo {
  namespace: string;
  type: 'organization' | 'employee';
  entityId: string;
  entityName: string;
  vectorCount: number;
}

export class NamespaceService {
  /**
   * Get organization namespace
   */
  getOrganizationNamespace(organizationId: string): string {
    return `org_${organizationId}`;
  }

  /**
   * Get employee namespace
   */
  getEmployeeNamespace(organizationId: string, employeeNumber: string): string {
    return `emp_${organizationId}_${employeeNumber.toLowerCase()}`;
  }

  /**
   * Get namespaces for RAG query based on user permissions
   */
  async getQueryNamespaces(
    userId: string,
    organizationId: string,
    options: {
      includeOrganization?: boolean;
      includePersonal?: boolean;
      employeeId?: string;
    } = {}
  ): Promise<string[]> {
    const { includeOrganization = true, includePersonal = true, employeeId } = options;
    const namespaces: string[] = [];

    // Always include organization namespace if permitted
    if (includeOrganization) {
      namespaces.push(this.getOrganizationNamespace(organizationId));
    }

    // Include personal namespace
    if (includePersonal && employeeId) {
      const employee = await db.query.employees.findFirst({
        where: eq(employees.id, employeeId),
      });

      if (employee) {
        namespaces.push(employee.pineconeNamespace);
      }
    }

    return namespaces;
  }

  /**
   * Get all namespaces for an organization
   */
  async getAllNamespaces(organizationId: string): Promise<NamespaceInfo[]> {
    const namespaces: NamespaceInfo[] = [];

    // Organization namespace
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (org) {
      const orgStats = await pineconeService.getNamespaceStats(org.pineconeNamespace);
      namespaces.push({
        namespace: org.pineconeNamespace,
        type: 'organization',
        entityId: org.id,
        entityName: org.name,
        vectorCount: orgStats.vectorCount,
      });
    }

    // Employee namespaces
    const allEmployees = await db.query.employees.findMany({
      where: eq(employees.organizationId, organizationId),
    });

    for (const emp of allEmployees) {
      const empStats = await pineconeService.getNamespaceStats(emp.pineconeNamespace);
      namespaces.push({
        namespace: emp.pineconeNamespace,
        type: 'employee',
        entityId: emp.id,
        entityName: emp.name,
        vectorCount: empStats.vectorCount,
      });
    }

    return namespaces;
  }

  /**
   * Sync namespace statistics to database
   */
  async syncNamespaceStats(organizationId: string): Promise<void> {
    const namespaces = await this.getAllNamespaces(organizationId);

    for (const ns of namespaces) {
      if (ns.type === 'employee') {
        await db
          .update(employees)
          .set({
            ragMetadata: {
              vectorCount: ns.vectorCount,
              lastSyncAt: new Date().toISOString(),
            },
            updatedAt: new Date(),
          })
          .where(eq(employees.id, ns.entityId));
      }
    }
  }
}

export const namespaceService = new NamespaceService();
```

### Tests for 9.4
- [ ] Organization namespace generation
- [ ] Employee namespace generation
- [ ] Query namespaces retrieval
- [ ] All namespaces listing
- [ ] Stats sync

---

## Task 9.5: Vector Search API

### 9.5.1 Search API Route

**File**: `app/api/vectors/search/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pineconeService } from '@/lib/services/pinecone.service';
import { namespaceService } from '@/lib/services/namespace.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(1, '검색어는 필수입니다'),
  organizationId: z.string().uuid(),
  employeeId: z.string().uuid().optional(),
  includeOrganization: z.boolean().default(true),
  includePersonal: z.boolean().default(true),
  topK: z.number().min(1).max(100).default(10),
  filter: z.record(z.any()).optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const validated = searchSchema.parse(body);

  // Get namespaces to search
  const namespaces = await namespaceService.getQueryNamespaces(
    user.id,
    validated.organizationId,
    {
      includeOrganization: validated.includeOrganization,
      includePersonal: validated.includePersonal,
      employeeId: validated.employeeId,
    }
  );

  if (namespaces.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // Search across namespaces
  const results = await pineconeService.queryMultiple(
    namespaces,
    validated.query,
    {
      topK: validated.topK,
      includeMetadata: true,
      filter: validated.filter,
    }
  );

  // Merge and sort results by score
  const allResults = results
    .flatMap((r) =>
      r.results.map((result) => ({
        ...result,
        namespace: r.namespace,
      }))
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, validated.topK);

  return NextResponse.json({ results: allResults });
});
```

### Tests for 9.5
- [ ] Search API
- [ ] Multi-namespace search
- [ ] Result merging
- [ ] Score sorting

---

## Phase Completion Checklist

- [ ] Pinecone client configured
- [ ] Embedding service working
- [ ] Pinecone service CRUD
- [ ] Dual namespace strategy
- [ ] Namespace manager
- [ ] Vector search API
- [ ] Stats synchronization
- [ ] All tests passing

---

## Next Phase

→ [Phase 10: RAG Chat System](./PHASE-10-RAG-CHAT.md)
