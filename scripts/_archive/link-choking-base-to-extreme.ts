import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function link() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug')
    .in('slug', [
      'choking-he-chokes-her',
      'choking-she-chokes-him',
      'onboarding-extreme-give-hetero-m',
      'onboarding-extreme-give-hetero-f',
    ]);

  const extremeM = scenes?.find(s => s.slug === 'onboarding-extreme-give-hetero-m');
  const extremeF = scenes?.find(s => s.slug === 'onboarding-extreme-give-hetero-f');
  const chokingHe = scenes?.find(s => s.slug === 'choking-he-chokes-her');
  const chokingShe = scenes?.find(s => s.slug === 'choking-she-chokes-him');

  // choking-he-chokes-her (man chokes woman) -> extreme-give-hetero-m
  if (chokingHe && extremeM) {
    const { error } = await supabase
      .from('scenes')
      .update({ shared_images_with: extremeM.id })
      .eq('id', chokingHe.id);
    console.log(error ? `Error: ${error.message}` : `${chokingHe.slug} -> ${extremeM.slug}`);
  }

  // choking-she-chokes-him (woman chokes man) -> extreme-give-hetero-f
  if (chokingShe && extremeF) {
    const { error } = await supabase
      .from('scenes')
      .update({ shared_images_with: extremeF.id })
      .eq('id', chokingShe.id);
    console.log(error ? `Error: ${error.message}` : `${chokingShe.slug} -> ${extremeF.slug}`);
  }
}

link();
