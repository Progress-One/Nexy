import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function findVague() {
  // Get all active scenes
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, title, user_description, category, role_direction, is_active')
    .eq('is_active', true)
    .not('slug', 'ilike', '%onboarding%')
    .not('slug', 'ilike', '%-give')
    .not('slug', 'ilike', '%-receive')
    .order('category')
    .order('slug');

  console.log('=== POTENTIALLY VAGUE SCENES ===\n');
  console.log('(Short descriptions or generic phrases)\n');

  const vaguePatterns = [
    'один партнёр', 'one partner',
    'партнёры', 'partners',
    'пара', 'couple',
    'или они', 'or they',
    'разные', 'different',
    'предпочтения', 'preferences',
    'интерес', 'interest',
  ];

  for (const s of scenes || []) {
    const desc = ((s.user_description as any)?.ru || '').toLowerCase();
    const descEn = ((s.user_description as any)?.en || '').toLowerCase();

    // Check if description is short (less than 80 chars) or contains vague patterns
    const isShort = desc.length < 80;
    const isVague = vaguePatterns.some(p => desc.includes(p) || descEn.includes(p));

    if (isShort || isVague) {
      const title = (s.title as any)?.ru || '';
      const fullDesc = (s.user_description as any)?.ru || '';
      console.log(`[${s.category}] ${s.slug}`);
      console.log(`  Title: ${title}`);
      console.log(`  Desc (${fullDesc.length} chars): ${fullDesc}`);
      console.log();
    }
  }
}

findVague();
