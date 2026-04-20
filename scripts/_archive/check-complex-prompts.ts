import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, generation_prompt, image_url');

  const noImageUrl = scenes?.filter(s => !s.image_url).length || 0;

  const complexPrompts = scenes?.filter(s => {
    const p = s.generation_prompt || '';
    return p.includes('masterpiece') || p.includes('best quality') || p.includes('1boy') || p.includes('1girl');
  }) || [];

  const complexWithImages = complexPrompts.filter(s => !!s.image_url);
  const complexWithoutImages = complexPrompts.filter(s => !s.image_url);

  console.log('Total scenes:', scenes?.length);
  console.log('Scenes without image_url:', noImageUrl);
  console.log('Scenes with complex prompts:', complexPrompts.length);
  console.log('  - with images:', complexWithImages.length);
  console.log('  - without images:', complexWithoutImages.length);

  // Show first 5 complex prompts with images
  console.log('\nFirst 5 complex prompts WITH images:');
  complexWithImages.slice(0, 5).forEach(s => {
    console.log(`  ${s.slug}: ${s.generation_prompt?.substring(0, 80)}...`);
  });
}

check();
