import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function compare() {
  // Get baseline scenes
  const { data: baseline } = await supabase
    .from('scenes')
    .select('slug, title, category')
    .eq('category', 'baseline')
    .eq('is_active', true)
    .order('slug');

  // Get onboarding scenes (unique categories)
  const { data: onboarding } = await supabase
    .from('scenes')
    .select('slug, title, category')
    .ilike('slug', 'onboarding-%')
    .eq('is_active', true)
    .order('slug');

  // Extract onboarding categories
  const onboardingCategories = new Set<string>();
  for (const s of onboarding || []) {
    // Extract category from slug like "onboarding-anal-give-hetero-m" -> "anal"
    const match = s.slug.match(/^onboarding-([a-z-]+?)-(give|receive|hetero|gay|lesbian)/);
    if (match) {
      onboardingCategories.add(match[1]);
    } else {
      // Try simpler pattern like "onboarding-romantic-hetero-m" -> "romantic"
      const match2 = s.slug.match(/^onboarding-([a-z-]+?)-(hetero|gay|lesbian)/);
      if (match2) {
        onboardingCategories.add(match2[1]);
      }
    }
  }

  console.log('=== ONBOARDING CATEGORIES ===');
  console.log([...onboardingCategories].sort().join(', '));
  console.log();

  console.log('=== BASELINE vs ONBOARDING ===\n');

  const baselineToOnboarding: Record<string, string> = {
    'anal-interest': 'anal',
    'oral-preference': 'oral',
    'power-dynamic': 'power',
    'toys-interest': 'toys',
    'roleplay-interest': 'roleplay',
    'pain-tolerance': 'rough',
    'watching-showing': 'exhibitionism',
    'group-interest': 'group (нет в onboarding)',
    'clothing-preference': 'lingerie',
    'verbal-preference': 'dirty-talk / praise',
    'body-fetishes': 'foot',
    'openness': '(нет аналога)',
    'intensity': '(нет аналога)',
    'fantasy-reality': '(нет аналога)',
  };

  console.log('| Baseline | Onboarding эквивалент | Покрыто? |');
  console.log('|----------|----------------------|----------|');

  for (const b of baseline || []) {
    const title = (b.title as any)?.ru || b.slug;
    const equivalent = baselineToOnboarding[b.slug] || '?';
    const covered = onboardingCategories.has(equivalent) || equivalent.includes(',') ? '✅' : '❌';
    console.log(`| ${b.slug} | ${equivalent} | ${covered} |`);
  }

  console.log('\n=== UNIQUE ONBOARDING SLUGS ===');
  const uniqueSlugs = new Set<string>();
  for (const s of onboarding || []) {
    const base = s.slug.replace(/-hetero-[mf]$/, '').replace(/-(gay|lesbian)$/, '').replace(/-(give|receive)/, '');
    uniqueSlugs.add(base);
  }
  console.log([...uniqueSlugs].sort().join('\n'));
}

compare();
