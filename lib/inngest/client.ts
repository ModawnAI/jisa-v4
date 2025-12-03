import { Inngest, EventSchemas } from 'inngest';
import type { ProcessedChunk, NamespaceStrategy } from '@/lib/services/document-processors';

// Type for PDF text chunks (legacy)
interface TextChunk {
  id: string;
  content: string;
  metadata: {
    chunkIndex: number;
    startChar: number;
    endChar: number;
    pageNumber?: number;
    totalChunks?: number;
    source?: string;
    [key: string]: unknown;
  };
}

// Define event types for type safety
type Events = {
  'document/process': {
    data: {
      documentId: string;
    };
  };
  'document/cleanup': {
    data: {
      documentId: string;
    };
  };
  'document/rollback': {
    data: {
      documentId: string;
      targetVersion: number;
    };
  };
  'batch/process': {
    data: {
      documentId: string;
      batchId: string;
      processingMode: 'company' | 'employee_split' | 'employee_aggregate';
      rows: Record<string, unknown>[];
      chunks?: TextChunk[];
      batchType: 'pdf' | 'tabular' | 'unknown';
      templateConfig: Record<string, unknown> | null;
    };
  };
  'batch/process-v2': {
    data: {
      documentId: string;
      batchId: string;
      processorType: string;
      namespaceStrategy: NamespaceStrategy;
      chunks: ProcessedChunk[];
      organizationId: string;
    };
  };
  'batch/all-complete': {
    data: {
      documentId: string;
    };
  };
  'vector/sync': {
    data: {
      documentId: string;
      namespace: string;
      operation: 'upsert' | 'delete';
    };
  };
};

export const inngest = new Inngest({
  id: 'contractorhub',
  schemas: new EventSchemas().fromRecord<Events>(),
});

export type InngestEvents = Events;
