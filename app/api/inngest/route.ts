import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import {
  documentProcess,
  documentCleanup,
  batchProcess,
  batchProcessV2,
  batchAllComplete,
  documentRollback,
  vectorSync,
} from '@/lib/inngest/functions';

// Create the serve handler with all functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    documentProcess,
    documentCleanup,
    batchProcess,
    batchProcessV2,
    batchAllComplete,
    documentRollback,
    vectorSync,
  ],
});
