/**
 * Chat Settings Service
 *
 * Manages AI agent configuration including name, welcome message,
 * signatures, and formatting rules.
 */

import { db } from '@/lib/db';
import {
  chatSettings,
  type ChatSettings,
  type NewChatSettings,
  DEFAULT_CHAT_SETTINGS,
} from '@/lib/db/schema/chat-settings';
import { eq } from 'drizzle-orm';

// In-memory cache for settings
let settingsCache: ChatSettings | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Get the active chat settings (singleton)
 * Uses in-memory caching to reduce database calls
 */
export async function getChatSettings(forceRefresh = false): Promise<ChatSettings> {
  const now = Date.now();

  // Return cached settings if valid
  if (!forceRefresh && settingsCache && now - cacheTimestamp < CACHE_TTL) {
    return settingsCache;
  }

  // Fetch from database
  const settings = await db.query.chatSettings.findFirst({
    where: eq(chatSettings.isActive, true),
  });

  if (settings) {
    settingsCache = settings;
    cacheTimestamp = now;
    return settings;
  }

  // Create default settings if none exist
  const [newSettings] = await db
    .insert(chatSettings)
    .values({
      ...DEFAULT_CHAT_SETTINGS,
      isActive: true,
    })
    .returning();

  settingsCache = newSettings;
  cacheTimestamp = now;
  return newSettings;
}

/**
 * Update chat settings
 */
export async function updateChatSettings(
  updates: Partial<NewChatSettings>,
  updatedBy?: string
): Promise<ChatSettings> {
  const current = await getChatSettings();

  const [updated] = await db
    .update(chatSettings)
    .set({
      ...updates,
      updatedBy: updatedBy || null,
      updatedAt: new Date(),
    })
    .where(eq(chatSettings.id, current.id))
    .returning();

  // Clear cache
  settingsCache = null;
  cacheTimestamp = 0;

  return updated;
}

/**
 * Clear settings cache (useful after updates)
 */
export function clearSettingsCache(): void {
  settingsCache = null;
  cacheTimestamp = 0;
}

/**
 * Get a specific error message from settings
 */
export async function getErrorMessage(
  type: 'generic' | 'not_registered' | 'no_results' | 'rate_limit'
): Promise<string> {
  const settings = await getChatSettings();

  switch (type) {
    case 'generic':
      return settings.errorGeneric;
    case 'not_registered':
      return settings.errorNotRegistered;
    case 'no_results':
      return settings.errorNoResults;
    case 'rate_limit':
      return settings.rateLimitMessage || settings.errorGeneric;
    default:
      return settings.errorGeneric;
  }
}

/**
 * Get welcome message for new users
 */
export async function getWelcomeMessage(): Promise<string> {
  const settings = await getChatSettings();
  return settings.welcomeMessage;
}

/**
 * Get agent name with optional emoji
 */
export async function getAgentName(includeEmoji = true): Promise<string> {
  const settings = await getChatSettings();

  if (includeEmoji && settings.agentEmoji && settings.useEmojis) {
    return `${settings.agentEmoji} ${settings.agentName}`;
  }

  return settings.agentName;
}

// Export service object for convenience
export const chatSettingsService = {
  get: getChatSettings,
  update: updateChatSettings,
  clearCache: clearSettingsCache,
  getErrorMessage,
  getWelcomeMessage,
  getAgentName,
};
