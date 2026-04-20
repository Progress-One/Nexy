import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const pattern = process.argv[2] || 'threesome';

  const { data, error } = await supabase
    .from('scenes')
    .select('slug, paired_scene, shared_images_with')
    .ilike('slug', `%${pattern}%`);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Scenes matching "${pattern}":\n`);
  data?.forEach(scene => {
    console.log(`${scene.slug}:`);
    console.log(`  paired_scene: ${scene.paired_scene || '(none)'}`);
    console.log(`  shared_images_with: ${scene.shared_images_with?.join(', ') || '(none)'}`);
    console.log();
  });
}

main();
