import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function deactivate() {
  const slugs = [
    'anal-interest',
    'oral-preference',
    'toys-interest',
    'roleplay-interest',
    'pain-tolerance',
    'watching-showing',
    'clothing-preference',
    'body-fetishes',
  ];

  const { data, error } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .in('slug', slugs)
    .select('slug, is_active');

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Deactivated baseline scenes:');
    for (const s of data || []) {
      console.log(`  ✅ ${s.slug}`);
    }
  }
}

deactivate();
