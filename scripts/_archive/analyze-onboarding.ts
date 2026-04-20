import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function analyze() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, role_direction, is_active, paired_with, title, user_description')
    .eq('category', 'onboarding')
    .order('slug');

  // Group by base topic (remove prefixes/suffixes)
  const byTopic: Record<string, typeof data> = {};

  data?.forEach(s => {
    // Extract topic: onboarding-{topic}-{variant}
    const match = s.slug.match(/^onboarding-(.+?)(?:-(give|receive|hetero-f|hetero-m|gay|lesbian))?$/);
    const topic = match ? match[1] : s.slug;

    // Clean up topic
    const cleanTopic = topic
      .replace(/-give$/, '')
      .replace(/-receive$/, '')
      .replace(/-hetero$/, '');

    if (!byTopic[cleanTopic]) byTopic[cleanTopic] = [];
    byTopic[cleanTopic].push(s);
  });

  console.log('='.repeat(70));
  console.log('ONBOARDING SCENES ANALYSIS');
  console.log('='.repeat(70));

  let totalActive = 0;
  let totalInactive = 0;

  Object.entries(byTopic).sort().forEach(([topic, scenes]) => {
    const active = scenes.filter(s => s.is_active !== false);
    const inactive = scenes.filter(s => s.is_active === false);
    totalActive += active.length;
    totalInactive += inactive.length;

    console.log(`\n## ${topic} (${active.length} active, ${inactive.length} inactive)`);

    scenes.forEach(s => {
      const status = s.is_active === false ? '[INACTIVE]' : '[ACTIVE]';
      const paired = s.paired_with ? '(paired)' : '';
      const variant = s.slug.replace(`onboarding-${topic}-`, '').replace(`onboarding-${topic}`, 'base');
      console.log(`  ${variant.padEnd(15)} ${status.padEnd(10)} ${paired}`);
    });
  });

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Topics: ${Object.keys(byTopic).length}`);
  console.log(`Total scenes: ${data?.length}`);
  console.log(`Active: ${totalActive}`);
  console.log(`Inactive: ${totalInactive}`);

  // Find topics with many variants
  console.log('\n## Topics by variant count:');
  Object.entries(byTopic)
    .map(([topic, scenes]) => ({ topic, count: scenes.length, active: scenes.filter(s => s.is_active !== false).length }))
    .sort((a, b) => b.count - a.count)
    .forEach(({ topic, count, active }) => {
      console.log(`  ${topic.padEnd(20)} ${count} total, ${active} active`);
    });
}

analyze();
