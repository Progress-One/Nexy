// @ts-nocheck - Legacy one-off migration script; depends on removed @supabase/supabase-js.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

async function main() {
  // Workaround: delete existing rows with new config types (if any), then insert
  // Since we can't ALTER TABLE via client, we'll just try to insert

  // Actually, let's check what config types exist
  const { data, error } = await supabase
    .from('discovery_config')
    .select('config_type')
    .limit(100);

  console.log('Existing config types:', data?.map(d => d.config_type));

  if (error) {
    console.error('Error:', error);
  }
}

main();
