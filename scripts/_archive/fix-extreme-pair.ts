import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function fix() {
  // Get both scenes in the F->M pair
  const { data: give } = await supabase
    .from('scenes')
    .select('*')
    .eq('slug', 'onboarding-extreme-give-hetero-f')
    .single();

  const { data: receive } = await supabase
    .from('scenes')
    .select('*')
    .eq('slug', 'onboarding-extreme-receive-hetero-m')
    .single();

  if (!give || !receive) {
    console.log('Scenes not found');
    return;
  }

  console.log('GIVE scene (onboarding-extreme-give-hetero-f):');
  console.log('  image_url:', give.image_url ? 'YES' : 'NO');
  console.log('  variants:', (give.image_variants || []).length);

  console.log('\nRECEIVE scene (onboarding-extreme-receive-hetero-m):');
  console.log('  image_url:', receive.image_url ? 'YES' : 'NO');
  console.log('  variants:', (receive.image_variants || []).length);

  // Copy from give to receive
  if (give.image_url && !receive.image_url) {
    console.log('\nCopying image_url from GIVE to RECEIVE...');

    // Also add the image_url as a variant if not already
    const variants = give.image_variants || [];

    await supabase
      .from('scenes')
      .update({
        image_url: give.image_url,
        image_variants: variants,
        accepted: give.accepted,
      })
      .eq('id', receive.id);

    console.log('DONE');
  }

  // Verify
  const { data: updated } = await supabase
    .from('scenes')
    .select('image_url, image_variants')
    .eq('slug', 'onboarding-extreme-receive-hetero-m')
    .single();

  console.log('\nAfter fix:');
  console.log('  image_url:', updated?.image_url ? 'YES' : 'NO');
  console.log('  variants:', (updated?.image_variants || []).length);
}

fix();
