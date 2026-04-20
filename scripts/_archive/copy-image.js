require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Get latex-on-her with variants
  const { data: source } = await supabase
    .from('scenes')
    .select('image_url, image_variants, selected_variant_index')
    .eq('slug', 'latex-on-her')
    .single();

  console.log('Source variants:', source?.image_variants?.length || 0);

  // Copy to latex-on-her-wear
  const { error } = await supabase
    .from('scenes')
    .update({
      image_url: source.image_url,
      image_variants: source.image_variants,
      selected_variant_index: source.selected_variant_index
    })
    .eq('slug', 'latex-on-her-wear');

  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Done! Copied to latex-on-her-wear');
  }
}
run();
