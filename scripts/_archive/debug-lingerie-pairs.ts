import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function debug() {
  const { data } = await supabase
    .from('scenes')
    .select('id, slug, user_description, paired_with, is_active')
    .ilike('slug', '%lingerie%')
    .eq('category', 'onboarding')
    .order('slug');

  console.log('=== ALL ONBOARDING LINGERIE SCENES ===\n');

  const byId: Record<string, any> = {};
  data?.forEach(s => byId[s.id] = s);

  data?.forEach(s => {
    const isReceive = s.slug?.includes('-receive');
    const isSub = s.slug?.includes('-sub-');
    const isSecondary = isReceive || isSub;
    const active = s.is_active !== false;

    console.log(`${s.slug}`);
    console.log(`  ID: ${s.id}`);
    console.log(`  Active: ${active}`);
    console.log(`  Secondary: ${isSecondary} (receive=${isReceive}, sub=${isSub})`);
    console.log(`  RU: ${s.user_description?.ru?.substring(0, 50)}...`);

    if (s.paired_with) {
      const paired = byId[s.paired_with];
      if (paired) {
        console.log(`  Paired with: ${paired.slug} (active=${paired.is_active !== false})`);
      } else {
        console.log(`  Paired with: ${s.paired_with} (NOT FOUND!)`);
      }
    } else {
      console.log(`  Paired with: NONE`);
    }
    console.log('');
  });

  console.log('=== FILTER SIMULATION ===\n');
  console.log('Scenes that should SHOW (not hidden by filter):');

  const activeScenes = data?.filter(s => s.is_active !== false) || [];
  const activeIds = new Set(activeScenes.map(s => s.id));

  activeScenes.forEach(s => {
    const isSecondary = s.slug?.includes('-receive') || s.slug?.includes('-sub-');

    if (isSecondary && s.paired_with && activeIds.has(s.paired_with)) {
      console.log(`  HIDDEN: ${s.slug} (paired with ${byId[s.paired_with]?.slug})`);
    } else {
      console.log(`  SHOW: ${s.slug}`);
    }
  });
}

debug();
