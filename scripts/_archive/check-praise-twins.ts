import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const slugs = [
    'onboarding-praise-give-hetero-f',
    'onboarding-praise-receive-hetero-m',
    'praise-she-praises-him-give',
    'praise-she-praises-him-receive',
  ];

  const { data } = await supabase
    .from('scenes')
    .select('id, slug, image_url, image_variants, paired_with, shared_images_with')
    .in('slug', slugs);

  const bySlug: Record<string, typeof data![0]> = {};
  data?.forEach(s => bySlug[s.slug] = s);

  for (const slug of slugs) {
    const s = bySlug[slug];
    if (!s) {
      console.log(`${slug}: NOT FOUND`);
      continue;
    }

    console.log(`\n${s.slug}:`);
    console.log(`  id: ${s.id}`);
    console.log(`  paired_with: ${s.paired_with || 'none'}`);
    console.log(`  shared_images_with: ${s.shared_images_with || 'none'}`);
    console.log(`  image_url: ${s.image_url?.substring(0, 60)}...`);
    console.log(`  variants: ${(s.image_variants || []).length}`);

    // Show first variant URL
    if (s.image_variants && s.image_variants.length > 0) {
      console.log(`  first variant: ${s.image_variants[0].url?.substring(0, 60)}...`);
    }
  }
}

check();
