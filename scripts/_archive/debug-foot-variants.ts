import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: all } = await supabase
    .from('scenes')
    .select('id, slug, image_variants, paired_with, shared_images_with, image_url');

  const byId: Record<string, any> = {};
  all?.forEach(s => byId[s.id] = s);

  // Focus on foot-worship-she-worships-his and its links
  const target = all?.find(s => s.slug === 'foot-worship-she-worships-his-receive');
  const onboarding = all?.find(s => s.slug === 'onboarding-foot-receive-hetero-m');

  console.log('=== foot-worship-she-worships-his-receive ===');
  if (target) {
    console.log('variants:', (target.image_variants || []).length);
    console.log('image_url:', target.image_url ? 'YES' : 'NO');
    console.log('paired_with:', target.paired_with ? byId[target.paired_with]?.slug : 'NONE');
    console.log('shared_images_with:', target.shared_images_with ? byId[target.shared_images_with]?.slug : 'NONE');
  }

  console.log('\n=== onboarding-foot-receive-hetero-m ===');
  if (onboarding) {
    console.log('variants:', (onboarding.image_variants || []).length);
    console.log('image_url:', onboarding.image_url ? 'YES' : 'NO');
    console.log('paired_with:', onboarding.paired_with ? byId[onboarding.paired_with]?.slug : 'NONE');
    console.log('shared_images_with:', onboarding.shared_images_with ? byId[onboarding.shared_images_with]?.slug : 'NONE');
  }

  // Check all she-worships-his variants
  console.log('\n=== ALL foot-worship-she-worships-his* ===');
  all?.filter(s => s.slug.includes('foot-worship-she-worships-his')).forEach(s => {
    console.log(`${s.slug}: ${(s.image_variants || []).length} variants, image_url: ${s.image_url ? 'YES' : 'NO'}`);
  });
}

check();
