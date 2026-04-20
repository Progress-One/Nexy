import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function simplifyPrompt(currentPrompt: string, essence: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Rewrite this image generation prompt following the EXACT format:

[WHO - explicit genders], [CLOTHING STATE], [SPECIFIC ACTION], [SETTING/LIGHTING]

RULES:
- Always specify gender (man/woman, not "person" or "couple")
- Always specify clothing (naked, lingerie, clothed, etc)
- ONE specific action only
- Can include lighting/setting
- REMOVE all quality words: masterpiece, best quality, high resolution, detailed, 4k, beautiful, perfect, stunning
- REMOVE all boilerplate: 1boy, 1girl, hetero, male/female, yuri, yaoi, bara

EXAMPLES:
- naked woman lying face down on bed, man's hands massaging her back with oil, warm bedroom lighting
- woman in red lingerie sitting on man's face, man naked lying on back, her hands gripping headboard
- man standing behind naked woman bent over desk, his hand raised mid-spank, office setting

Scene context: ${essence}

Current prompt:
${currentPrompt}

Return ONLY the rewritten prompt in the format above. If you cannot rewrite it, return the original without quality words.`
      }]
    })
  });

  const data = await response.json();
  if (data.content && data.content[0]?.text) {
    const result = data.content[0].text.trim();
    // Check for refusal messages
    if (result.includes("I can't") || result.includes("I cannot") || result.includes("I'm unable")) {
      return currentPrompt; // Keep original if AI refuses
    }
    return result;
  }
  return currentPrompt;
}

async function main() {
  // Get scenes WITHOUT image_url that have image_prompt but no generation_prompt
  const { data: scenes, error } = await supabase
    .from('scenes')
    .select('id, slug, image_prompt, generation_prompt, user_description')
    .or('image_url.is.null,image_url.eq.')
    .not('image_prompt', 'is', null)
    .order('slug');

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Filter to only those needing simplification
  const BAD_WORDS = ['masterpiece', 'best quality', 'high resolution', 'detailed', '1boy', '1girl', 'hetero', 'male/female', 'yuri', 'yaoi', 'bara'];
  const needsSimplify = scenes?.filter(s => {
    const prompt = s.image_prompt || '';
    return BAD_WORDS.some(w => prompt.toLowerCase().includes(w.toLowerCase()));
  }) || [];

  console.log(`Found ${needsSimplify.length} scenes without image_url needing prompt simplification\n`);

  let simplified = 0;
  for (const scene of needsSimplify) {
    // Use image_prompt as source (the default from JSON)
    const sourcePrompt = scene.image_prompt || '';

    console.log(`\n--- ${scene.slug} ---`);
    console.log(`SRC (image_prompt): ${sourcePrompt.substring(0, 80)}...`);

    // Get essence from user_description
    const desc = scene.user_description as { en?: string; ru?: string } | null;
    const essence = desc?.en || desc?.ru || '';

    try {
      const newPrompt = await simplifyPrompt(sourcePrompt, essence);
      console.log(`NEW (generation_prompt): ${newPrompt}`);

      // Save to generation_prompt (working copy), keep image_prompt as reference
      await supabase
        .from('scenes')
        .update({ generation_prompt: newPrompt })
        .eq('id', scene.id);

      simplified++;

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log(`ERROR: ${(err as Error).message}`);
    }
  }

  console.log(`\n=== SIMPLIFIED ${simplified} PROMPTS ===`);
}

main();
