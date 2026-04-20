import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const pairs = [
  { discovery: 'collar-she-owns-him', onboarding: 'onboarding-power-dom-hetero-f' },
  { discovery: 'collar-he-owns-her', onboarding: 'onboarding-power-dom-hetero-m' },
  { discovery: 'pegging', onboarding: 'onboarding-anal-give-hetero-f' },
  { discovery: 'cum-where-to-finish', onboarding: 'onboarding-body-fluids-give-hetero-m' },
  { discovery: 'squirt-receiving', onboarding: 'onboarding-body-fluids-give-hetero-f' },
  { discovery: 'female-lingerie', onboarding: 'onboarding-lingerie-receive-hetero-m' },
];

async function compare() {
  const allSlugs = pairs.flatMap(p => [p.discovery, p.onboarding]);

  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, title, user_description, generation_prompt, image_prompt')
    .in('slug', allSlugs);

  if (!scenes) return;

  const bySlug = new Map(scenes.map(s => [s.slug, s]));

  for (const pair of pairs) {
    const disc = bySlug.get(pair.discovery);
    const onb = bySlug.get(pair.onboarding);

    console.log('\n' + '='.repeat(70));
    console.log(`DISCOVERY: ${pair.discovery}`);
    console.log(`ONBOARDING: ${pair.onboarding}`);
    console.log('='.repeat(70));

    if (disc) {
      const title = (disc.title as any)?.ru || '';
      const desc = (disc.user_description as any)?.ru || '';
      const prompt = disc.generation_prompt || disc.image_prompt || '';
      console.log(`\n[DISCOVERY] ${title}`);
      console.log(`  Описание: ${desc}`);
      console.log(`  Prompt: ${prompt.substring(0, 100)}...`);
    } else {
      console.log(`\n[DISCOVERY] NOT FOUND`);
    }

    if (onb) {
      const title = (onb.title as any)?.ru || '';
      const desc = (onb.user_description as any)?.ru || '';
      const prompt = onb.generation_prompt || onb.image_prompt || '';
      console.log(`\n[ONBOARDING] ${title}`);
      console.log(`  Описание: ${desc}`);
      console.log(`  Prompt: ${prompt.substring(0, 100)}...`);
    } else {
      console.log(`\n[ONBOARDING] NOT FOUND`);
    }

    console.log('\n→ СОВПАДАЮТ ПО СУТИ? ___');
  }
}

compare();
