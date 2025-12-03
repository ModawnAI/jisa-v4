/**
 * Supabase Client Utilities
 * Provides both anonymous and service role clients for different use cases
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

// Singleton instances
let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

/**
 * Get anonymous Supabase client
 * Use for general queries with RLS
 */
export function getSupabaseClient(): SupabaseClient {
  if (!anonClient) {
    anonClient = createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return anonClient;
}

/**
 * Get service role Supabase client
 * Use for admin operations that bypass RLS
 * WARNING: Only use in secure server-side contexts!
 */
export function getServiceClient(): SupabaseClient {
  if (!serviceClient) {
    serviceClient = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return serviceClient;
}

/**
 * Create a fresh client instance (for testing or isolation)
 */
export function createSupabaseClient(useServiceRole: boolean = false): SupabaseClient {
  return createClient(
    config.supabase.url,
    useServiceRole ? config.supabase.serviceRoleKey : config.supabase.anonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

const supabaseUtils = {
  getSupabaseClient,
  getServiceClient,
  createSupabaseClient,
};

export default supabaseUtils;
