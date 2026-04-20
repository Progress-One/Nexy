import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Words to remove (boilerplate)
const REMOVE_WORDS = [
  'masterpiece',
  'best quality',
  'high quality',
  'high resolution',
  'highly detailed',
  'detailed',
  '4k',
  '8k',
  'uhd',
  'hd',
  '1boy',
  '1girl',
  '2boys',
  '2girls',
  '1man',
  '1woman',
  'hetero',
  'heterosexual',
  'male/female',
  'female/male',
  'yuri',
  'yaoi',
  'bara',
  'male focus',
  'female focus',
  'adult',
  'sexual act',
  'indoors',
  'private setting',
  'couple',
];

function cleanPrompt(prompt: string): string {
  let cleaned = prompt;

  // Remove each word/phrase (case insensitive)
  for (const word of REMOVE_WORDS) {
    // Match word with optional trailing comma/space
    const regex = new RegExp(`\\b${word}\\b[,\\s]*`, 'gi');
    cleaned = cleaned.replace(regex, '');
  }

  // Clean up multiple commas/spaces
  cleaned = cleaned
    .replace(/,\s*,/g, ',')        // multiple commas
    .replace(/^\s*,\s*/g, '')      // leading comma
    .replace(/\s*,\s*$/g, '')      // trailing comma
    .replace(/\s+/g, ' ')          // multiple spaces
    .trim();

  return cleaned;
}

async function main() {
  // Get scenes WITHOUT image_url
  const { data: scenes, error } = await supabase
    .from('scenes')
    .select('id, slug, image_prompt, generation_prompt')
    .or('image_url.is.null,image_url.eq.')
    .not('image_prompt', 'is', null)
    .order('slug');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${scenes?.length || 0} scenes without image_url\n`);

  let cleaned = 0;
  for (const scene of scenes || []) {
    const source = scene.image_prompt || '';
    const newPrompt = cleanPrompt(source);

    // Skip if no change needed
    if (newPrompt === source) continue;

    console.log(`${scene.slug}:`);
    console.log(`  OLD: ${source.substring(0, 70)}...`);
    console.log(`  NEW: ${newPrompt.substring(0, 70)}...`);

    await supabase
      .from('scenes')
      .update({ generation_prompt: newPrompt })
      .eq('id', scene.id);

    cleaned++;
  }

  console.log(`\n=== CLEANED ${cleaned} PROMPTS ===`);
}

main();
