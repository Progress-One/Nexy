import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const pattern = process.argv[2] || 'blindfold';

async function run() {
  const { data, error } = await supabase
    .from('scenes')
    .select('slug, category, tags, user_description')
    .ilike('slug', `%${pattern}%`);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Scenes matching "${pattern}":\n`);
  for (const s of data || []) {
    console.log('='.repeat(50));
    console.log('Slug:', s.slug);
    console.log('Category:', s.category);
    console.log('Tags:', s.tags);
console.log('Description:', JSON.stringify(s.user_description));
  }
}

run();
