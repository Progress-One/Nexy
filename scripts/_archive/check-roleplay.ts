import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkRoleplay() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, title, user_description, generation_prompt, category, role_direction, is_active')
    .or('category.eq.roleplay,slug.ilike.%roleplay%,slug.ilike.%teacher%,slug.ilike.%boss%,slug.ilike.%doctor%,slug.ilike.%stranger%,slug.ilike.%taboo%,slug.ilike.%service%')
    .order('category')
    .order('slug');

  console.log('=== ROLEPLAY SCENES ===\n');

  let currentCategory = '';
  for (const s of scenes || []) {
    if (s.category !== currentCategory) {
      currentCategory = s.category || 'unknown';
      console.log(`\n--- ${currentCategory.toUpperCase()} ---`);
    }
    const title = (s.title as any)?.ru || '';
    const desc = (s.user_description as any)?.ru || '';
    const active = s.is_active ? '' : ' [INACTIVE]';
    console.log(`\n${s.slug} (${s.role_direction})${active}`);
    console.log(`  Title: ${title}`);
    console.log(`  Desc: ${desc.substring(0, 120)}...`);
    console.log(`  Prompt: ${(s.generation_prompt || '').substring(0, 100)}...`);
  }

  console.log(`\n\nTotal: ${scenes?.length || 0}`);
}

checkRoleplay();
