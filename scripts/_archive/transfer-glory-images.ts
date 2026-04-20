import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get source scene with variants
  const { data: source } = await supabase
    .from('scenes')
    .select('id, slug, image_variants')
    .eq('slug', 'glory-hole-cunnilingus-give')
    .single();

  if (!source || !source.image_variants?.length) {
    console.log('No source variants found');
    return;
  }

  console.log('Source:', source.slug, '- variants:', source.image_variants.length);

  // Get target scene
  const { data: target } = await supabase
    .from('scenes')
    .select('id, slug')
    .eq('slug', 'glory-hole-blowjob-give')
    .single();

  if (!target) {
    console.log('Target not found');
    return;
  }

  // Copy variants to target
  const { error } = await supabase
    .from('scenes')
    .update({ image_variants: source.image_variants })
    .eq('id', target.id);

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Transferred', source.image_variants.length, 'variants to', target.slug);
  }

  // Also set up sharing for glory-hole-blowjob-receive
  const { error: shareError } = await supabase
    .from('scenes')
    .update({ shared_images_with: target.id })
    .eq('slug', 'glory-hole-blowjob-receive');

  if (shareError) {
    console.log('Share error:', shareError.message);
  } else {
    console.log('Set glory-hole-blowjob-receive to share images with glory-hole-blowjob-give');
  }
}

run();
