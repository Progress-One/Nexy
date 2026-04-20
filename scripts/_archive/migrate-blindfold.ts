import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get the original blindfold scene with images
  const { data: original } = await supabase
    .from('scenes')
    .select('id, slug, image_url, image_variants')
    .eq('slug', 'blindfold')
    .single();

  if (!original) {
    console.error('Original blindfold scene not found');
    return;
  }

  console.log('Original scene:', original.slug);
  console.log('  image_url:', original.image_url ? 'YES' : 'no');
  console.log('  variants:', Array.isArray(original.image_variants) ? original.image_variants.length : 0);

  // Transfer images to blindfold-on-her (as the "primary" scene for images)
  const { data: newPrimary, error: transferError } = await supabase
    .from('scenes')
    .update({
      image_url: original.image_url,
      image_variants: original.image_variants,
      shared_images_with: null, // No longer needs sharing
    })
    .eq('slug', 'blindfold-on-her')
    .select('id, slug');

  if (transferError) {
    console.error('Error transferring images:', transferError.message);
    return;
  }

  console.log('\nTransferred images to:', newPrimary?.[0]?.slug);

  // Update blindfold-on-him to share from blindfold-on-her
  const { error: shareError } = await supabase
    .from('scenes')
    .update({ shared_images_with: newPrimary?.[0]?.id })
    .eq('slug', 'blindfold-on-him');

  if (shareError) {
    console.error('Error setting sharing:', shareError.message);
    return;
  }

  console.log('Updated blindfold-on-him to share from blindfold-on-her');

  // Delete the original blindfold scene
  const { error: deleteError } = await supabase
    .from('scenes')
    .delete()
    .eq('slug', 'blindfold');

  if (deleteError) {
    console.error('Error deleting original:', deleteError.message);
    return;
  }

  console.log('\nDeleted original blindfold scene');

  // Verify
  console.log('\n--- Verification ---');
  const { data: remaining } = await supabase
    .from('scenes')
    .select('slug, image_url, image_variants, shared_images_with')
    .ilike('slug', '%blindfold%');

  for (const s of remaining || []) {
    const hasImage = !!s.image_url;
    const variants = Array.isArray(s.image_variants) ? s.image_variants.length : 0;
    console.log(s.slug);
    console.log('  image_url:', hasImage ? 'YES' : 'no');
    console.log('  variants:', variants);
    console.log('  shared_images_with:', s.shared_images_with || 'none');
  }
}

run();
