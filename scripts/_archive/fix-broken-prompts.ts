import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Detect refusal messages
const REFUSAL_PATTERNS = [
  "I can't help",
  "I can't provide",
  "I cannot help",
  "I cannot provide",
  "I'm unable to",
  "explicit sexual content",
  "sexually explicit",
  "I'd be happy to help with",
  "Would you like help with",
];

function isRefusal(prompt: string): boolean {
  return REFUSAL_PATTERNS.some(pattern => prompt.toLowerCase().includes(pattern.toLowerCase()));
}

async function fix() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, generation_prompt');

  const broken = scenes?.filter(s => s.generation_prompt && isRefusal(s.generation_prompt)) || [];

  console.log(`Found ${broken.length} scenes with broken prompts (refusal messages):\n`);

  for (const scene of broken) {
    console.log(`${scene.slug}:`);
    console.log(`  "${scene.generation_prompt?.substring(0, 80)}..."`);

    // Clear the broken prompt so it can be regenerated
    await supabase
      .from('scenes')
      .update({ generation_prompt: null })
      .eq('id', scene.id);

    console.log(`  CLEARED\n`);
  }

  console.log(`=== FIXED ${broken.length} SCENES ===`);
}

fix();
