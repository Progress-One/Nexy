import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function find() {
  // Discovery scenes to find twins for
  const { data: discovery } = await supabase
    .from('scenes')
    .select('slug, title, user_description, generation_prompt, role_direction, shared_images_with')
    .or('slug.ilike.%free-use%,slug.ilike.%bondage%,slug.ilike.%harness%')
    .not('slug', 'ilike', '%onboarding%');

  console.log('=== DISCOVERY SCENES NEEDING TWINS ===\n');
  for (const s of discovery || []) {
    const title = (s.title as any)?.ru || '';
    const desc = (s.user_description as any)?.ru || '';
    const linked = s.shared_images_with ? 'LINKED' : 'NOT LINKED';
    console.log(`[${linked}] ${s.slug} (${s.role_direction})`);
    console.log(`  Title: ${title}`);
    console.log(`  Desc: ${desc.substring(0, 100)}...`);
    console.log(`  Prompt: ${(s.generation_prompt || '').substring(0, 80)}...`);
    console.log();
  }

  // Potential onboarding matches
  console.log('\n=== POTENTIAL ONBOARDING MATCHES ===\n');

  // For free-use → power scenes
  const { data: powerScenes } = await supabase
    .from('scenes')
    .select('slug, title, user_description, generation_prompt, role_direction')
    .ilike('slug', 'onboarding-power%');

  console.log('--- POWER (for free-use) ---');
  for (const s of powerScenes || []) {
    const desc = (s.user_description as any)?.ru || '';
    console.log(`${s.slug} (${s.role_direction})`);
    console.log(`  Desc: ${desc.substring(0, 100)}...`);
    console.log();
  }

  // For bondage
  const { data: bondageScenes } = await supabase
    .from('scenes')
    .select('slug, title, user_description, generation_prompt, role_direction')
    .ilike('slug', 'onboarding-bondage%');

  console.log('--- BONDAGE (for bondage) ---');
  for (const s of bondageScenes || []) {
    const desc = (s.user_description as any)?.ru || '';
    console.log(`${s.slug} (${s.role_direction})`);
    console.log(`  Desc: ${desc.substring(0, 100)}...`);
    console.log();
  }

  // For harness → lingerie scenes
  const { data: lingerieScenes } = await supabase
    .from('scenes')
    .select('slug, title, user_description, generation_prompt, role_direction')
    .ilike('slug', 'onboarding-lingerie%');

  console.log('--- LINGERIE (for harness) ---');
  for (const s of lingerieScenes || []) {
    const desc = (s.user_description as any)?.ru || '';
    console.log(`${s.slug} (${s.role_direction})`);
    console.log(`  Desc: ${desc.substring(0, 100)}...`);
    console.log();
  }
}

find();
