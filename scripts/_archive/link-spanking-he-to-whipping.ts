import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function link() {
  const { data: source } = await supabase
    .from('scenes')
    .select('id, slug, image_variants')
    .eq('slug', 'whipping-m-to-f-give')
    .single();

  if (!source) {
    console.log('Source not found!');
    return;
  }

  const variants = source.image_variants?.filter((x: any) => !x.is_placeholder)?.length || 0;
  console.log(`Source: ${source.slug} (${variants} variants)\n`);

  const { data: targets } = await supabase
    .from('scenes')
    .select('id, slug')
    .ilike('slug', '%spanking-he-spanks-her%');

  for (const t of targets || []) {
    const { error } = await supabase
      .from('scenes')
      .update({ shared_images_with: source.id })
      .eq('id', t.id);

    console.log(error ? `Error ${t.slug}: ${error.message}` : `${t.slug} -> ${source.slug}`);
  }
}

link();
