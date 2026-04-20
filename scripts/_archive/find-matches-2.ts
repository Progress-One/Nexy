import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function findMatches() {
  // Find breath-control and striptease scenes
  const { data: discoveryScenes } = await supabase
    .from('scenes')
    .select('slug, title, user_description, generation_prompt, category, role_direction')
    .or('slug.ilike.%breath%,slug.ilike.%choking%,slug.ilike.%striptease%,title->>ru.ilike.%дыхани%,title->>ru.ilike.%стриптиз%')
    .not('slug', 'ilike', '%onboarding%');

  console.log('=== DISCOVERY SCENES ===\n');
  for (const s of discoveryScenes || []) {
    const title = (s.title as any)?.ru || '';
    const desc = (s.user_description as any)?.ru || '';
    console.log(`${s.slug} (${s.role_direction})`);
    console.log(`  Title: ${title}`);
    console.log(`  Desc: ${desc}`);
    console.log(`  Prompt: ${(s.generation_prompt || '').substring(0, 80)}...`);
    console.log();
  }

  // Find potential onboarding matches
  console.log('\n=== POTENTIAL ONBOARDING MATCHES ===\n');

  // For breath control → extreme scenes
  const { data: extremeScenes } = await supabase
    .from('scenes')
    .select('slug, title, user_description, generation_prompt, role_direction, image_variants')
    .ilike('slug', 'onboarding-extreme%');

  console.log('--- EXTREME (for breath control) ---');
  for (const s of extremeScenes || []) {
    const title = (s.title as any)?.ru || '';
    const desc = (s.user_description as any)?.ru || '';
    const variants = (s.image_variants as any[] || []).length;
    console.log(`${s.slug} (${s.role_direction}) [${variants} variants]`);
    console.log(`  Desc: ${desc}`);
    console.log(`  Prompt: ${(s.generation_prompt || '').substring(0, 80)}...`);
    console.log();
  }

  // For striptease → exhibitionism scenes
  const { data: exhibScenes } = await supabase
    .from('scenes')
    .select('slug, title, user_description, generation_prompt, role_direction, image_variants')
    .ilike('slug', 'onboarding-exhibitionism%');

  console.log('--- EXHIBITIONISM (for striptease) ---');
  for (const s of exhibScenes || []) {
    const title = (s.title as any)?.ru || '';
    const desc = (s.user_description as any)?.ru || '';
    const variants = (s.image_variants as any[] || []).length;
    console.log(`${s.slug} (${s.role_direction}) [${variants} variants]`);
    console.log(`  Desc: ${desc}`);
    console.log(`  Prompt: ${(s.generation_prompt || '').substring(0, 80)}...`);
    console.log();
  }
}

findMatches();
