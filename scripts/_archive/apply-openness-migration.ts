import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Add openness_level column to profiles
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS openness_level TEXT
      CHECK (openness_level IN ('conservative', 'moderate', 'adventurous'));
    `
  });

  if (error) {
    console.log('RPC not available, trying direct query...');
    // If RPC not available, the column might already exist or needs manual migration
    // Let's check if we can read from profiles with the new column
    const { data, error: selectError } = await supabase
      .from('profiles')
      .select('openness_level')
      .limit(1);

    if (selectError && selectError.message.includes('openness_level')) {
      console.log('Column does not exist. Please run this SQL manually in Supabase Dashboard:');
      console.log(`
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS openness_level TEXT
CHECK (openness_level IN ('conservative', 'moderate', 'adventurous'));
      `);
    } else {
      console.log('Column already exists or was created successfully');
    }
  } else {
    console.log('Migration applied successfully');
  }
}

run();
