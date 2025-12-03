/**
 * Text Chunking Utility for RAG
 * Implements recursive character text splitting similar to LangChain
 */

export interface TextChunk {
  id: string;
  content: string;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  chunkIndex: number;
  startChar: number;
  endChar: number;
  pageNumber?: number;
  totalChunks?: number;
  source?: string;
  [key: string]: unknown;
}

export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
  keepSeparator?: boolean;
  metadata?: Record<string, unknown>;
}

// Default separators in order of priority (similar to LangChain)
const DEFAULT_SEPARATORS = [
  '\n\n\n',     // Multiple newlines (section breaks)
  '\n\n',       // Paragraph breaks
  '\n',         // Line breaks
  '. ',         // Sentence endings
  '? ',         // Question endings
  '! ',         // Exclamation endings
  '; ',         // Semicolon breaks
  ', ',         // Comma breaks
  ' ',          // Word breaks
  '',           // Character level (last resort)
];

/**
 * Recursively split text into chunks using a hierarchy of separators
 */
export function chunkText(
  text: string,
  options: ChunkingOptions = {}
): TextChunk[] {
  const {
    chunkSize = 1000,
    chunkOverlap = 200,
    separators = DEFAULT_SEPARATORS,
    keepSeparator = true,
    metadata = {},
  } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  const textChunks = recursiveSplit(text, separators, chunkSize, keepSeparator);

  // Merge small chunks and handle overlap
  const mergedChunks = mergeChunks(textChunks, chunkSize, chunkOverlap);

  let charOffset = 0;
  mergedChunks.forEach((content, index) => {
    const chunk: TextChunk = {
      id: `chunk_${index}`,
      content: content.trim(),
      metadata: {
        chunkIndex: index,
        startChar: charOffset,
        endChar: charOffset + content.length,
        totalChunks: mergedChunks.length,
        ...metadata,
      },
    };
    chunks.push(chunk);

    // Update offset (account for overlap)
    charOffset += content.length - chunkOverlap;
  });

  // Update totalChunks in all chunks
  chunks.forEach((chunk) => {
    chunk.metadata.totalChunks = chunks.length;
  });

  return chunks;
}

/**
 * Recursively split text using separators
 */
function recursiveSplit(
  text: string,
  separators: string[],
  chunkSize: number,
  keepSeparator: boolean
): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }

  // Find the best separator for this text
  let bestSeparator = '';
  for (const sep of separators) {
    if (sep === '') {
      bestSeparator = sep;
      break;
    }
    if (text.includes(sep)) {
      bestSeparator = sep;
      break;
    }
  }

  // Split by the separator
  let splits: string[];
  if (bestSeparator === '') {
    // Character-level split
    splits = text.match(new RegExp(`.{1,${chunkSize}}`, 'g')) || [text];
  } else {
    splits = text.split(bestSeparator);
    if (keepSeparator && bestSeparator !== '') {
      // Re-add separator to the end of each split (except last)
      splits = splits.map((s, i) =>
        i < splits.length - 1 ? s + bestSeparator : s
      );
    }
  }

  // Recursively process splits that are still too large
  const result: string[] = [];
  for (const split of splits) {
    if (split.length <= chunkSize) {
      result.push(split);
    } else {
      // Use remaining separators
      const remainingSeparators = separators.slice(separators.indexOf(bestSeparator) + 1);
      const subSplits = recursiveSplit(split, remainingSeparators, chunkSize, keepSeparator);
      result.push(...subSplits);
    }
  }

  return result;
}

/**
 * Merge small chunks and create overlapping windows
 */
function mergeChunks(
  chunks: string[],
  chunkSize: number,
  overlap: number
): string[] {
  if (chunks.length === 0) return [];

  const merged: string[] = [];
  let currentChunk = '';

  for (const chunk of chunks) {
    const trimmedChunk = chunk.trim();
    if (!trimmedChunk) continue;

    if (currentChunk.length + trimmedChunk.length <= chunkSize) {
      currentChunk += (currentChunk ? ' ' : '') + trimmedChunk;
    } else {
      if (currentChunk) {
        merged.push(currentChunk);
      }
      // Start new chunk with overlap from previous
      if (overlap > 0 && currentChunk.length > overlap) {
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + ' ' + trimmedChunk;
      } else {
        currentChunk = trimmedChunk;
      }
    }
  }

  if (currentChunk.trim()) {
    merged.push(currentChunk);
  }

  return merged;
}

/**
 * Chunk text by pages (for PDFs)
 */
export function chunkByPages(
  pages: Array<{ pageNumber: number; text: string }>,
  options: ChunkingOptions = {}
): TextChunk[] {
  const allChunks: TextChunk[] = [];
  let globalIndex = 0;

  for (const page of pages) {
    const pageChunks = chunkText(page.text, {
      ...options,
      metadata: {
        ...options.metadata,
        pageNumber: page.pageNumber,
      },
    });

    // Update global indices
    for (const chunk of pageChunks) {
      chunk.id = `chunk_${globalIndex}`;
      chunk.metadata.chunkIndex = globalIndex;
      allChunks.push(chunk);
      globalIndex++;
    }
  }

  // Update totalChunks
  allChunks.forEach((chunk) => {
    chunk.metadata.totalChunks = allChunks.length;
  });

  return allChunks;
}

/**
 * Create semantic chunks based on content structure
 */
export function createSemanticChunks(
  text: string,
  options: ChunkingOptions & { detectHeaders?: boolean } = {}
): TextChunk[] {
  const { detectHeaders = true, ...chunkOptions } = options;

  if (!detectHeaders) {
    return chunkText(text, chunkOptions);
  }

  // Detect headers/sections (lines that look like headers)
  const headerPatterns = [
    /^#{1,6}\s+.+$/gm,           // Markdown headers
    /^[A-Z][A-Z\s]+$/gm,         // ALL CAPS lines
    /^\d+\.\s+[A-Z].+$/gm,       // Numbered sections
    /^[IVX]+\.\s+.+$/gm,         // Roman numeral sections
  ];

  const sections: Array<{ title: string; content: string; start: number }> = [];
  let lastEnd = 0;

  for (const pattern of headerPatterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastEnd) {
        // Add content before this header
        const content = text.slice(lastEnd, match.index);
        if (content.trim()) {
          sections.push({
            title: '',
            content: content.trim(),
            start: lastEnd,
          });
        }
      }
      lastEnd = match.index;
    }
  }

  // Add remaining content
  if (lastEnd < text.length) {
    sections.push({
      title: '',
      content: text.slice(lastEnd).trim(),
      start: lastEnd,
    });
  }

  // If no sections detected, use regular chunking
  if (sections.length === 0) {
    return chunkText(text, chunkOptions);
  }

  // Chunk each section
  const allChunks: TextChunk[] = [];
  let globalIndex = 0;

  for (const section of sections) {
    const sectionChunks = chunkText(section.content, {
      ...chunkOptions,
      metadata: {
        ...chunkOptions.metadata,
        sectionTitle: section.title,
        sectionStart: section.start,
      },
    });

    for (const chunk of sectionChunks) {
      chunk.id = `chunk_${globalIndex}`;
      chunk.metadata.chunkIndex = globalIndex;
      allChunks.push(chunk);
      globalIndex++;
    }
  }

  allChunks.forEach((chunk) => {
    chunk.metadata.totalChunks = allChunks.length;
  });

  return allChunks;
}

export const textChunker = {
  chunk: chunkText,
  chunkByPages,
  createSemanticChunks,
};
