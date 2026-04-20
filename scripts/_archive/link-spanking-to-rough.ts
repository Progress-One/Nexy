import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function link() {
  // Get scenes
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, image_url, image_variants')
    .in('slug', [
      'spanking-she-spanks-him-give',
      'spanking-she-spanks-him-receive',
      'onboarding-rough-give-hetero-f',
    ]);

  const source = scenes?.find(s => s.slug === 'onboarding-rough-give-hetero-f');
  const give = scenes?.find(s => s.slug === 'spanking-she-spanks-him-give');
  const receive = scenes?.find(s => s.slug === 'spanking-she-spanks-him-receive');

  if (!source) {
    console.log('Source not found!');
    return;
  }

  console.log('Source:', source.slug);
  console.log('  variants:', source.image_variants?.length || 0);

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
