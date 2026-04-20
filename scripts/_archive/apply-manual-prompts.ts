import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function apply() {
  // Load manual prompts
  const manualPrompts = JSON.parse(fs.readFileSync('scripts/manual-prompts.json', 'utf-8'));
  const manualSlugs = Object.keys(manualPrompts);
  console.log(`Loaded ${manualSlugs.length} manual prompts\n`);

  // Get all scenes without image_url
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug')
    .or('image_url.is.null,image_url.eq.');

  console.log(`Total scenes without image_url: ${scenes?.length || 0}`);

  // Apply prompts
  let applied = 0;
  for (const scene of scenes || []) {
    if (manualPrompts[scene.slug]) {
      await supabase
        .from('scenes')
        .update({ generation_prompt: manualPrompts[scene.slug] })
        .eq('id', scene.id);
      applied++;
    }
  }

  console.log(`Applied: ${applied}`);
  console.log(`Remaining: ${(scenes?.length || 0) - applied}`);

  // Show which ones are missing
  const missingSlugs = scenes?.filter(s => !manualPrompts[s.slug]).map(s => s.slug) || [];
  if (missingSlugs.length > 0) {
    console.log('\nMissing prompts for:');
    missingSlugs.forEach(s => console.log(`  - ${s}`));
  }
}

apply();
