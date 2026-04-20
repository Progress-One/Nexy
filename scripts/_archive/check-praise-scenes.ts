import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('id, slug, category, paired_with, shared_images_with, generation_prompt, image_url')
    .or('slug.ilike.%praise%,slug.ilike.%похвал%')
    .order('slug');

  console.log('=== PRAISE SCENES ===\n');

  for (const s of data || []) {
    console.log(`[${s.category}] ${s.slug}`);
    console.log(`  id: ${s.id}`);
    console.log(`  paired_with: ${s.paired_with || 'none'}`);
    console.log(`  shared_images_with: ${s.shared_images_with || 'none'}`);
    console.log(`  prompt: ${(s.generation_prompt || '').substring(0, 80)}...`);
    console.log(`  has_image: ${s.image_url ? 'YES' : 'NO'}`);
    console.log();
  }

  // Also check verbal category
  const { data: verbal } = await supabase
    .from('scenes')
    .select('id, slug, category, paired_with, shared_images_with')
    .eq('category', 'verbal');

  console.log('=== VERBAL CATEGORY ===\n');
  for (const s of verbal || []) {
    console.log(`${s.slug} - paired: ${s.paired_with || 'none'}, shared: ${s.shared_images_with || 'none'}`);
  }
}

check();
