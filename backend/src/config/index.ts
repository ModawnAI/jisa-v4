/**
 * Configuration Module
 * Centralizes all environment variables and configuration settings
 */

import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Load environment variables
dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'debug',

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  // AI APIs
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },

  // Pinecone
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    index: process.env.PINECONE_INDEX || 'hof-branch-chatbot',
    namespace: 'hof-knowledge-base-max',
  },

  // KakaoTalk (Optional)
  kakao: {
    adminKey: process.env.KAKAO_ADMIN_KEY || '',
    restApiKey: process.env.KAKAO_REST_API_KEY || '',
  },

  // RAG Settings
  rag: {
    embeddingModel: 'text-embedding-3-large',
    embeddingDimensions: 3072,
    relevanceThreshold: 0.3,
    defaultTopK: 10,
  },
};

// Validate required environment variables
export function validateConfig(): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
    'OPENAI_API_KEY',
    'PINECONE_API_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export default config;
