import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// UUIDs from the error URLs
const brokenIds = [
  '4354e5a7-9887-435c-a706-3139a78718ca',
  'a429ae5c-8dc6-4876-80d9-4ed155e5aa33',
];

async function findBroken() {
  // Check if these are scene IDs
  const { data: scenesById } = await supabase
    .from('scenes')
    .select('id, slug, image_url')
    .in('id', brokenIds);

  console.log('=== SCENES BY ID ===');
  for (const s of scenesById || []) {
    console.log(`${s.slug}: ${s.image_url?.substring(0, 80)}...`);
  }

  // Also search for scenes with these patterns in image_url
  console.log('\n=== SCENES WITH BROKEN IMAGE URLS ===');
  const { data: allScenes } = await supabase
    .from('scenes')
    .select('id, slug, image_url')
    .or('image_url.ilike.%4354e5a7-9887-435c%,image_url.ilike.%a429ae5c-8dc6-4876%');

  for (const s of allScenes || []) {
    console.log(`${s.slug}`);
    console.log(`  ${s.image_url}`);
  }

  if (!allScenes || allScenes.length === 0) {
    console.log('No scenes found with these URLs');
  }
}

findBroken();
