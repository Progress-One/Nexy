import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const slugs = [
    'cunnilingus-give',
    'cunnilingus-receive',
    'onboarding-oral-give-hetero-m',
    'onboarding-oral-receive-hetero-f',
    'pussy-worship-give',
  ];

  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, image_url, image_variants, shared_images_with')
    .in('slug', slugs);

  for (const s of scenes || []) {
    const variantCount = s.image_variants?.filter((v: any) => !v.is_placeholder)?.length || 0;
    const sharedWith = scenes?.find(x => x.id === s.shared_images_with)?.slug || s.shared_images_with || 'none';

    console.log(`${s.slug}:`);
    console.log(`  variants: ${variantCount}`);
    console.log(`  has_image_url: ${!!s.image_url}`);
    console.log(`  shared_images_with: ${sharedWith}`);
    console.log();
  }
}

check();
