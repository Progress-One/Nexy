import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function link() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug')
    .in('slug', [
      'choking-he-chokes-her-give',
      'choking-he-chokes-her-receive',
      'onboarding-rough-give-hetero-m',
    ]);

  const source = scenes?.find(s => s.slug === 'onboarding-rough-give-hetero-m');
  const give = scenes?.find(s => s.slug === 'choking-he-chokes-her-give');
  const receive = scenes?.find(s => s.slug === 'choking-he-chokes-her-receive');

  if (!source) {
    console.log('Source not found!');
    return;
  }

  console.log('Source:', source.slug);

  for (const target of [give, receive]) {
    if (!target) continue;

    const { error } = await supabase
      .from('scenes')
      .update({ shared_images_with: source.id })
      .eq('id', target.id);

    if (error) {
      console.log(`Error ${target.slug}:`, error.message);
    } else {
      console.log(`Linked ${target.slug} -> ${source.slug}`);
    }
  }
}

link();
