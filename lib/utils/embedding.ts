import OpenAI from 'openai';

// Initialize OpenAI client lazily
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// Embedding configuration
export const EMBEDDING_CONFIG = {
  model: 'text-embedding-3-large',
  dimensions: 3072,
  maxInputLength: 8191, // Max tokens for text-embedding-3-large
  batchSize: 100, // Max batch size for OpenAI embeddings
} as const;

/**
 * Create embedding for a single text
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();

  // Truncate if too long (rough estimate: 4 chars per token)
  const maxChars = EMBEDDING_CONFIG.maxInputLength * 4;
  const truncatedText = text.length > maxChars
    ? text.substring(0, maxChars)
    : text;

  const response = await client.embeddings.create({
    model: EMBEDDING_CONFIG.model,
    input: truncatedText,
    dimensions: EMBEDDING_CONFIG.dimensions,
  });

  return response.data[0].embedding;
}

/**
 * Create embeddings for multiple texts in batch
 */
export async function createEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const client = getOpenAIClient();

  if (texts.length === 0) {
    return [];
  }

  const results: number[][] = [];
  const maxChars = EMBEDDING_CONFIG.maxInputLength * 4;

  // Process in batches
  for (let i = 0; i < texts.length; i += EMBEDDING_CONFIG.batchSize) {
    const batch = texts.slice(i, i + EMBEDDING_CONFIG.batchSize);

    // Truncate each text if needed
    const truncatedBatch = batch.map((text) =>
      text.length > maxChars ? text.substring(0, maxChars) : text
    );

    const response = await client.embeddings.create({
      model: EMBEDDING_CONFIG.model,
      input: truncatedBatch,
      dimensions: EMBEDDING_CONFIG.dimensions,
    });

    // Sort by index to maintain order
    const sortedData = [...response.data].sort((a, b) => a.index - b.index);
    results.push(...sortedData.map((d) => d.embedding));
  }

  return results;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Chunk text into smaller pieces for embedding
 */
export function chunkText(
  text: string,
  options: {
    maxChunkSize?: number;
    overlap?: number;
    separator?: string;
  } = {}
): string[] {
  const {
    maxChunkSize = 2000, // Characters
    overlap = 200,
    separator = '\n',
  } = options;

  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  const paragraphs = text.split(separator);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    // If paragraph itself is too long, split it
    if (paragraph.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // Split long paragraph by sentences or fixed size
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      for (const sentence of sentences) {
        if (sentence.length > maxChunkSize) {
          // Force split at maxChunkSize with overlap
          for (let i = 0; i < sentence.length; i += maxChunkSize - overlap) {
            chunks.push(sentence.substring(i, i + maxChunkSize).trim());
          }
        } else if ((currentChunk + sentence).length > maxChunkSize) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          currentChunk += sentence;
        }
      }
    } else if ((currentChunk + separator + paragraph).length > maxChunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk = currentChunk ? currentChunk + separator + paragraph : paragraph;
    }
  }

  // Add remaining chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Format row data for embedding
 */
export function formatRowForEmbedding(
  row: Record<string, unknown>,
  template?: string
): string {
  // If template provided, use it
  if (template) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
      String(row[key] ?? '')
    );
  }

  // Default: key-value format
  return Object.entries(row)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

/**
 * Extract metadata fields from row
 */
export function extractMetadata(
  row: Record<string, unknown>,
  fields?: string[]
): Record<string, unknown> {
  if (!fields || fields.length === 0) {
    return {};
  }

  const metadata: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in row && row[field] != null) {
      metadata[field] = row[field];
    }
  }
  return metadata;
}
