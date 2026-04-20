import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const BAD_WORDS = ['masterpiece', 'best quality', 'high resolution', 'detailed', '1boy', '1girl', 'hetero', 'male/female', 'yuri', 'yaoi', 'bara'];

function hasComplex(prompt: string | null): boolean {
  if (!prompt) return false;
  return BAD_WORDS.some(w => prompt.toLowerCase().includes(w.toLowerCase()));
}

async function check() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, image_prompt, generation_prompt, image_url');

  const noImageUrl = scenes?.filter(s => !s.image_url) || [];

  console.log(`Scenes without image_url: ${noImageUrl.length}\n`);

  // Check image_prompt (default from JSON)
  const complexImagePrompt = noImageUrl.filter(s => hasComplex(s.image_prompt));
  console.log(`With complex image_prompt (default): ${complexImagePrompt.length}`);

  // Check generation_prompt (working)
  const complexGenPrompt = noImageUrl.filter(s => hasComplex(s.generation_prompt));
  console.log(`With complex generation_prompt (working): ${complexGenPrompt.length}`);

  // Show samples
  if (complexImagePrompt.length > 0) {
    console.log('\nSample complex image_prompt:');
    complexImagePrompt.slice(0, 3).forEach(s => {
      console.log(`  ${s.slug}: ${s.image_prompt?.substring(0, 80)}...`);
    });
  }

  // Check if generation_prompt is null but image_prompt exists
  const hasDefaultOnly = noImageUrl.filter(s => s.image_prompt && !s.generation_prompt);
  console.log(`\nWith image_prompt but NO generation_prompt: ${hasDefaultOnly.length}`);
}

check();
