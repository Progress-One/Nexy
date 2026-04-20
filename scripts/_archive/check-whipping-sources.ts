import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  // Get whipping base scenes
  const { data: whipping } = await supabase
    .from('scenes')
    .select('slug, shared_images_with')
    .in('slug', ['whipping-m-to-f', 'whipping-f-to-m']);

  console.log('Whipping base scenes:');
  for (const s of whipping || []) {
    if (s.shared_images_with) {
      const { data: source } = await supabase
        .from('scenes')
        .select('slug, image_variants')
        .eq('id', s.shared_images_with)
        .single();
      const v = source?.image_variants?.filter((x: any) => !x.is_placeholder)?.length || 0;
      console.log(`  ${s.slug} -> ${source?.slug} (variants: ${v})`);
    } else {
      console.log(`  ${s.slug} -> NOT SHARED`);
    }
  }

  // Check rough scenes variants
  console.log('\nRough onboarding scenes:');
  const { data: rough } = await supabase
    .from('scenes')
    .select('slug, image_variants')
    .ilike('slug', '%onboarding-rough%');

  for (const s of rough || []) {
    const v = s.image_variants?.filter((x: any) => !x.is_placeholder)?.length || 0;
    console.log(`  ${s.slug}: variants=${v}`);
  }
}

check();
