import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function analyze() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, generation_prompt, user_description, paired_with, role_direction')
    .eq('category', 'onboarding')
    .neq('is_active', false)
    .order('slug');

  console.log(`=== ALL ACTIVE ONBOARDING SCENES (${data?.length}) ===\n`);

  // Group by topic
  const topics: Record<string, any[]> = {};

  data?.forEach(s => {
    // Extract topic from slug: onboarding-TOPIC-direction
    const parts = s.slug.replace('onboarding-', '').split('-');
    // Topic is everything before hetero/gay/lesbian or give/receive/dom/sub
    let topic = '';
    for (const p of parts) {
      if (['hetero', 'gay', 'lesbian', 'give', 'receive', 'dom', 'sub', 'm', 'f', 'alt'].includes(p)) break;
      topic += (topic ? '-' : '') + p;
    }

    if (!topics[topic]) topics[topic] = [];
    topics[topic].push(s);
  });

  // Print grouped
  for (const [topic, scenes] of Object.entries(topics).sort()) {
    console.log(`\n=== ${topic.toUpperCase()} (${scenes.length} scenes) ===`);

    scenes.forEach(s => {
      const shortSlug = s.slug.replace('onboarding-', '').replace(topic + '-', '');
      const paired = s.paired_with ? 'PAIRED' : '';
      const desc = s.user_description?.ru?.substring(0, 50) || '';
      console.log(`  ${shortSlug.padEnd(25)} ${paired.padEnd(8)} "${desc}..."`);
    });
  }
}

analyze();
