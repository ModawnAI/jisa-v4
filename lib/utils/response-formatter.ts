/**
 * Response Formatter Utility
 *
 * Formats AI responses for KakaoTalk display:
 * - Removes all markdown formatting
 * - Wraps text to specified width (default 22 Korean characters)
 * - Handles Korean character widths properly
 * - Supports emojis and indentation
 * - Adds optional header/footer
 */

import { getChatSettings } from '@/lib/services/chat-settings.service';

/**
 * Get the display width of a character
 * Korean characters and full-width characters = 2
 * ASCII and half-width characters = 1
 * Emojis = 2 (approximate)
 */
function getCharWidth(char: string): number {
  const code = char.charCodeAt(0);

  // Korean Hangul
  if (code >= 0xAC00 && code <= 0xD7A3) return 2;
  if (code >= 0x1100 && code <= 0x11FF) return 2; // Hangul Jamo
  if (code >= 0x3130 && code <= 0x318F) return 2; // Hangul Compatibility Jamo

  // CJK characters
  if (code >= 0x4E00 && code <= 0x9FFF) return 2;
  if (code >= 0x3400 && code <= 0x4DBF) return 2;

  // Full-width characters
  if (code >= 0xFF00 && code <= 0xFFEF) return 2;

  // Emojis (simplified detection)
  if (code >= 0x1F300 && code <= 0x1F9FF) return 2;
  if (code >= 0x2600 && code <= 0x26FF) return 2;
  if (code >= 0x2700 && code <= 0x27BF) return 2;

  // Check for emoji using regex (handles surrogate pairs)
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u;
  if (emojiRegex.test(char)) return 2;

  return 1;
}

/**
 * Get the display width of a string
 */
function getStringWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    width += getCharWidth(char);
  }
  return width;
}

/**
 * Remove all markdown formatting from text
 */
function removeMarkdown(text: string): string {
  let result = text;

  // Remove headers (# ## ### etc)
  result = result.replace(/^#{1,6}\s*/gm, '');

  // Remove bold (**text** or __text__)
  result = result.replace(/\*\*([^*]+)\*\*/g, '$1');
  result = result.replace(/__([^_]+)__/g, '$1');

  // Remove italic (*text* or _text_)
  result = result.replace(/\*([^*]+)\*/g, '$1');
  result = result.replace(/_([^_]+)_/g, '$1');

  // Remove strikethrough (~~text~~)
  result = result.replace(/~~([^~]+)~~/g, '$1');

  // Remove inline code (`code`)
  result = result.replace(/`([^`]+)`/g, '$1');

  // Remove code blocks (```code```)
  result = result.replace(/```[\s\S]*?```/g, '');

  // Remove links [text](url) -> text
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove images ![alt](url)
  result = result.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');

  // Remove horizontal rules (--- or ***)
  result = result.replace(/^[-*]{3,}$/gm, '');

  // Remove blockquotes (> text)
  result = result.replace(/^>\s*/gm, '');

  // Remove table formatting (|)
  result = result.replace(/\|/g, ' ');

  // Remove list markers but keep content
  result = result.replace(/^[\s]*[-*+]\s+/gm, '  ');
  result = result.replace(/^[\s]*\d+\.\s+/gm, '');

  // Clean up multiple spaces
  result = result.replace(/  +/g, ' ');

  // Clean up multiple newlines (max 2)
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

/**
 * Wrap a single line to specified width
 * Returns array of wrapped lines
 */
function wrapLine(line: string, maxWidth: number): string[] {
  if (getStringWidth(line) <= maxWidth) {
    return [line];
  }

  const wrapped: string[] = [];
  let currentLine = '';
  let currentWidth = 0;

  // Detect indentation
  const indentMatch = line.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : '';
  const indentWidth = getStringWidth(indent);
  const contentStart = indent.length;

  // Process character by character for accurate width
  const chars = [...line.slice(contentStart)];

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const charWidth = getCharWidth(char);

    // Check if adding this char would exceed width
    if (currentWidth + charWidth > maxWidth - (wrapped.length > 0 ? indentWidth : 0)) {
      // Find a good break point (space or punctuation)
      let breakPoint = currentLine.length;
      for (let j = currentLine.length - 1; j >= Math.max(0, currentLine.length - 10); j--) {
        if (/[\s,.\-!?。、，！？]/.test(currentLine[j])) {
          breakPoint = j + 1;
          break;
        }
      }

      if (breakPoint === currentLine.length || breakPoint < currentLine.length / 2) {
        // No good break point, break at current position
        if (currentLine.length > 0) {
          wrapped.push((wrapped.length > 0 ? indent : '') + currentLine);
          currentLine = char;
          currentWidth = charWidth;
        }
      } else {
        // Break at the good point
        const before = currentLine.slice(0, breakPoint).trimEnd();
        const after = currentLine.slice(breakPoint).trimStart();
        wrapped.push((wrapped.length > 0 ? indent : '') + before);
        currentLine = after + char;
        currentWidth = getStringWidth(currentLine);
      }
    } else {
      currentLine += char;
      currentWidth += charWidth;
    }
  }

  // Add remaining content
  if (currentLine.length > 0) {
    wrapped.push((wrapped.length > 0 ? indent : '') + currentLine);
  }

  return wrapped;
}

/**
 * Word wrap text to specified width
 */
function wordWrap(text: string, maxWidth: number): string {
  const lines = text.split('\n');
  const wrappedLines: string[] = [];

  for (const line of lines) {
    if (line.trim() === '') {
      wrappedLines.push('');
      continue;
    }

    const wrapped = wrapLine(line, maxWidth);
    wrappedLines.push(...wrapped);
  }

  return wrappedLines.join('\n');
}

/**
 * Format response options
 */
export interface FormatOptions {
  maxWidth?: number;
  header?: string;
  footer?: string;
  removeMarkdownFormatting?: boolean;
  preserveEmojis?: boolean;
}

/**
 * Format a response for KakaoTalk display
 * Main entry point for response formatting
 */
export async function formatResponse(
  text: string,
  options: FormatOptions = {}
): Promise<string> {
  const settings = await getChatSettings();

  const {
    maxWidth = settings.maxLineWidth,
    header = settings.headerEnabled ? settings.headerTemplate : undefined,
    footer = settings.signatureEnabled ? settings.signature : undefined,
    removeMarkdownFormatting = true,
    preserveEmojis = settings.useEmojis,
  } = options;

  let result = text;

  // Step 1: Remove markdown formatting
  if (removeMarkdownFormatting) {
    result = removeMarkdown(result);
  }

  // Step 2: Remove emojis if not allowed
  if (!preserveEmojis) {
    result = result.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '');
  }

  // Step 3: Word wrap to max width
  result = wordWrap(result, maxWidth);

  // Step 4: Add header if present
  if (header && header.trim()) {
    result = `${header.trim()}\n\n${result}`;
  }

  // Step 5: Add footer if present
  if (footer && footer.trim()) {
    result = `${result}\n\n${footer.trim()}`;
  }

  // Step 6: Final cleanup
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.trim();

  return result;
}

/**
 * Format response synchronously with provided settings
 * Use this when you already have settings loaded
 */
export function formatResponseSync(
  text: string,
  maxWidth: number = 22,
  options: {
    header?: string;
    footer?: string;
    removeMarkdownFormatting?: boolean;
    preserveEmojis?: boolean;
  } = {}
): string {
  const {
    header,
    footer,
    removeMarkdownFormatting = true,
    preserveEmojis = true,
  } = options;

  let result = text;

  // Step 1: Remove markdown formatting
  if (removeMarkdownFormatting) {
    result = removeMarkdown(result);
  }

  // Step 2: Remove emojis if not allowed
  if (!preserveEmojis) {
    result = result.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '');
  }

  // Step 3: Word wrap to max width
  result = wordWrap(result, maxWidth);

  // Step 4: Add header if present
  if (header && header.trim()) {
    result = `${header.trim()}\n\n${result}`;
  }

  // Step 5: Add footer if present
  if (footer && footer.trim()) {
    result = `${result}\n\n${footer.trim()}`;
  }

  // Step 6: Final cleanup
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.trim();

  return result;
}

/**
 * Preview how text will look when formatted
 * Useful for admin UI preview
 */
export function previewFormat(
  text: string,
  maxWidth: number = 22
): { formatted: string; lineCount: number; maxActualWidth: number } {
  const formatted = formatResponseSync(text, maxWidth);
  const lines = formatted.split('\n');
  const maxActualWidth = Math.max(...lines.map(getStringWidth));

  return {
    formatted,
    lineCount: lines.length,
    maxActualWidth,
  };
}

// Export utilities
export const responseFormatter = {
  format: formatResponse,
  formatSync: formatResponseSync,
  preview: previewFormat,
  removeMarkdown,
  getCharWidth,
  getStringWidth,
  wordWrap,
};
