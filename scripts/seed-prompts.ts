/**
 * Seed Default Prompt Templates
 *
 * Run: npx tsx scripts/seed-prompts.ts
 *
 * Seeds the default AI prompt templates for KakaoTalk chatbot.
 * Can be run on an existing database without affecting other data.
 */

import { config } from 'dotenv';

// Load environment variables BEFORE importing db
config({ path: '.env.local' });

async function seedPrompts() {
  // Dynamic imports to ensure env is loaded first
  const { seedPromptTemplates } = await import('../lib/services/prompt-template.service');

  console.log('🌱 Seeding prompt templates...\n');

  try {
    await seedPromptTemplates();
    console.log('\n✅ Prompt templates seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedPrompts();
