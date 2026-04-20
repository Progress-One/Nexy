import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const BAD_WORDS = ['masterpiece', 'best quality', 'high resolution', 'detailed', '1boy', '1girl', 'hetero', 'male/female', 'yuri', 'yaoi', 'bara'];

function hasComplexPrompt(prompt: string): boolean {
  return BAD_WORDS.some(w => prompt.toLowerCase().includes(w.toLowerCase()));
}

async function check() {
  // Get scenes WITHOUT image_url
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, generation_prompt, image_url, image_variants')
    .or('image_url.is.null,image_url.eq.');

  console.log(`Total scenes without image_url: ${scenes?.length || 0}\n`);

  const withPrompt = scenes?.filter(s => s.generation_prompt) || [];
  console.log(`Scenes without image_url BUT with prompt: ${withPrompt.length}`);

  const complexPrompts = withPrompt.filter(s => hasComplexPrompt(s.generation_prompt || ''));
  console.log(`  - of which have complex prompts: ${complexPrompts.length}\n`);

  if (complexPrompts.length > 0) {
    console.log('Complex prompts in scenes without image_url:');
    complexPrompts.forEach(s => {
      console.log(`\n${s.slug}:`);
      console.log(`  prompt: ${s.generation_prompt?.substring(0, 100)}...`);
      console.log(`  variants: ${(s.image_variants as any[] || []).length}`);
    });
  }

  // Also check scenes WITH image_url
  const { data: withImage } = await supabase
    .from('scenes')
    .select('slug, generation_prompt')
    .not('image_url', 'is', null)
    .neq('image_url', '');

  const complexWithImage = withImage?.filter(s => s.generation_prompt && hasComplexPrompt(s.generation_prompt)) || [];
  console.log(`\nScenes WITH image_url that have complex prompts: ${complexWithImage.length}`);
  complexWithImage.slice(0, 5).forEach(s => {
    console.log(`  ${s.slug}`);
  });
}

check();
