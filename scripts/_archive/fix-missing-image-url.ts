import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function fix() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, image_url, image_variants, paired_with, shared_images_with');

  let fixed = 0;

  for (const s of scenes || []) {
    const variants = s.image_variants || [];
    const hasVariants = variants.length > 0 && variants.some((v: any) => v.url && !v.is_placeholder);
    const hasImageUrl = !!s.image_url;

    if (hasVariants && !hasImageUrl) {
      // Find first real variant (not placeholder)
      const firstVariant = variants.find((v: any) => v.url && !v.is_placeholder);
      if (firstVariant) {
        console.log(`FIX: ${s.slug}`);
        console.log(`  Setting image_url from variant: ${firstVariant.url.substring(0, 50)}...`);

        await supabase
          .from('scenes')
          .update({ image_url: firstVariant.url })
          .eq('id', s.id);

        // Sync to linked scenes if they have no image_url
        const linkedIds = [s.paired_with, s.shared_images_with].filter(Boolean);
        for (const linkedId of linkedIds) {
          const { data: linked } = await supabase
            .from('scenes')
            .select('image_url, slug')
            .eq('id', linkedId)
            .single();

          if (linked && !linked.image_url) {
            await supabase
              .from('scenes')
              .update({ image_url: firstVariant.url })
              .eq('id', linkedId);
            console.log(`  synced to: ${linked.slug}`);
          }
        }

        fixed++;
      }
    }
  }

  console.log(`\n=== FIXED ${fixed} SCENES ===`);
}

fix();
