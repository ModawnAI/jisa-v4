import * as fs from 'fs';
import * as path from 'path';
import { publicDocumentProcessor } from '../lib/services/document-processors/public-document-processor';
import type { ProcessorOptions } from '../lib/services/document-processors/types';

const DATA_DIR = path.join(process.cwd(), 'data', 'everyone');

async function main() {
  const files = fs.readdirSync(DATA_DIR);

  console.log('Testing detectDocType with real processor:');
  for (const filename of files.slice(0, 2)) {
    console.log('\n--- Processing:', filename);
    const filePath = path.join(DATA_DIR, filename);
    const buffer = fs.readFileSync(filePath);

    const ext = path.extname(filename).toLowerCase();
    const mimeType =
      ext === '.pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const doc = {
      id: 'test-' + Date.now(),
      organizationId: 'public',
      fileName: filename,
      originalFileName: filename,
      mimeType,
      fileType: ext === '.pdf' ? 'pdf' as const : 'excel' as const,
    };

    const options: ProcessorOptions = {
      organizationId: 'public',
      clearanceLevel: 'basic',
      maxChunkSize: 1000,
      chunkOverlap: 200,
    };

    try {
      const result = await publicDocumentProcessor.process(buffer, doc, options);

      if (result.chunks.length > 0) {
        const metadata = result.chunks[0].metadata as Record<string, unknown>;
        console.log('  Result doc_type:', metadata.doc_type);
      }
    } catch (e) {
      console.log('  Error:', (e as Error).message);
    }
  }
}

main().catch(console.error);
