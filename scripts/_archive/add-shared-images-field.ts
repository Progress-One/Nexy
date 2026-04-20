import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function migrate() {
  // Add column via raw SQL
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE scenes ADD COLUMN IF NOT EXISTS shared_images_with UUID REFERENCES scenes(id);
      CREATE INDEX IF NOT EXISTS idx_scenes_shared_images_with ON scenes(shared_images_with);
    `
  });

  if (error) {
    console.log('RPC not available, trying direct approach...');

    // Try to update a scene with the new field to see if it exists
    const { error: testError } = await supabase
      .from('scenes')
      .update({ shared_images_with: null })
      .eq('slug', 'test-nonexistent');

    if (testError?.message?.includes('shared_images_with')) {
      console.log('Column does not exist. Please run this SQL in Supabase dashboard:');
      console.log(`
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS shared_images_with UUID REFERENCES scenes(id);
CREATE INDEX IF NOT EXISTS idx_scenes_shared_images_with ON scenes(shared_images_with);
      `);
    } else {
      console.log('Column already exists or was created.');
    }
  } else {
    console.log('Migration applied successfully.');
  }
}

migrate();
