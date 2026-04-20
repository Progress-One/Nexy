/**
 * Compatibility type replacing @supabase/supabase-js SupabaseClient.
 * All existing query/lib files keep working without changes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseClient = {
  from: (table: string) => any;
  rpc: (fnName: string, params: Record<string, unknown>) => any;
  storage: { from: (bucket: string) => any };
  auth: { getUser: () => Promise<any> };
};

/**
 * Drop-in for admin API routes that import { createClient } from '@/lib/supabase/compat-types'.
 * Returns a service-level pg client.
 */
export { createServiceClient as createClient } from './server';
