import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const slugs = [
    'onboarding-lingerie-hetero-f', 'onboarding-lingerie-hetero-m',
    'onboarding-extreme-hetero-f', 'onboarding-extreme-hetero-m',
    'onboarding-romantic-hetero-f', 'onboarding-romantic-hetero-m',
    'onboarding-toys-hetero-f', 'onboarding-toys-hetero-m',
  ];

  const { data } = await supabase
    .from('scenes')
    .select('slug, user_description')
    .in('slug', slugs);

  console.log('Simple pairs (hetero-m ↔ hetero-f) analysis:\n');

  const byTopic: Record<string, any[]> = {};
  data?.forEach(s => {
    const topic = s.slug.replace('onboarding-', '').replace('-hetero-f', '').replace('-hetero-m', '');
    if (!byTopic[topic]) byTopic[topic] = [];
    byTopic[topic].push(s);
  });

  Object.entries(byTopic).sort().forEach(([topic, scenes]) => {
    console.log(`## ${topic}`);
    scenes.sort((a, b) => a.slug.localeCompare(b.slug)).forEach(s => {
      const gender = s.slug.includes('-hetero-f') ? 'F' : 'M';
      console.log(`  ${gender}: ${s.user_description?.ru || '(empty)'}`);
    });
    console.log('');
  });
}

check();
