import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const slugs = process.argv.slice(2);
  if (slugs.length === 0) {
    console.log('Usage: npx tsx scripts/clear-images.ts <slug1> <slug2> ...');
    return;
  }

  for (const slug of slugs) {
    const { error } = await supabase
      .from('scenes')
      .update({ image_url: null, image_variants: null })
      .eq('slug', slug);
    
    console.log(slug + ':', error ? error.message : 'cleared');
  }
}

main();
