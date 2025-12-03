import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Pinecone } from '@pinecone-database/pinecone';

/**
 * Health check endpoint for KakaoTalk bot
 * GET /api/kakao/health
 *
 * Returns:
 * - Service status (Supabase, Pinecone, API keys)
 * - Overall health status
 */

interface ServiceStatus {
  status: 'healthy' | 'unhealthy' | 'unknown';
  latency_ms?: number;
  error?: string;
}

export async function GET() {
  const startTime = Date.now();
  const services: Record<string, ServiceStatus> = {};

  // Check Supabase
  try {
    const supabase = createAdminClient();
    const supabaseStart = Date.now();
    const { error } = await supabase.from('kakao_profiles').select('id').limit(1);
    const supabaseLatency = Date.now() - supabaseStart;

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      services.supabase = {
        status: 'unhealthy',
        latency_ms: supabaseLatency,
        error: error.message,
      };
    } else {
      services.supabase = {
        status: 'healthy',
        latency_ms: supabaseLatency,
      };
    }
  } catch (error) {
    services.supabase = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check Pinecone
  try {
    const pineconeStart = Date.now();
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    const indexName = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX || 'jisa-v4';
    const index = pinecone.index(indexName);
    await index.describeIndexStats();
    const pineconeLatency = Date.now() - pineconeStart;

    services.pinecone = {
      status: 'healthy',
      latency_ms: pineconeLatency,
    };
  } catch (error) {
    services.pinecone = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check API Keys presence
  const apiKeys = {
    gemini: !!process.env.GEMINI_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    pinecone: !!process.env.PINECONE_API_KEY,
    supabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const missingKeys = Object.entries(apiKeys)
    .filter(([, present]) => !present)
    .map(([key]) => key);

  services.api_keys = {
    status: missingKeys.length === 0 ? 'healthy' : 'unhealthy',
    error: missingKeys.length > 0 ? `Missing: ${missingKeys.join(', ')}` : undefined,
  };

  // Calculate overall health
  const allHealthy = Object.values(services).every((s) => s.status === 'healthy');
  const totalLatency = Date.now() - startTime;

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      service: 'jisa-kakao-nextjs',
      timestamp: new Date().toISOString(),
      latency_ms: totalLatency,
      services,
      environment: process.env.NODE_ENV,
    },
    {
      status: allHealthy ? 200 : 503,
    }
  );
}
