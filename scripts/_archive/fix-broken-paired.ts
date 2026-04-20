import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function fix() {
  // Find all paired scenes where one has variants and one doesn't
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, image_url, image_variants, paired_with, accepted')
    .not('paired_with', 'is', null);

  if (!scenes) return;

  const byId: Record<string, typeof scenes[0]> = {};
  scenes.forEach(s => byId[s.id] = s);

  let fixed = 0;

  for (const scene of scenes) {
    const paired = byId[scene.paired_with!];
    if (!paired) continue;

    const myVariants = scene.image_variants || [];
    const pairedVariants = paired.image_variants || [];

    // If I have no variants but paired does, copy them
    if (myVariants.length === 0 && pairedVariants.length > 0) {
      console.log(`\nFIX: ${scene.slug} (0 variants) <- ${paired.slug} (${pairedVariants.length} variants)`);

      await supabase
        .from('scenes')
        .update({
          image_url: paired.image_url,
          image_variants: pairedVariants,
          accepted: paired.accepted,
        })
        .eq('id', scene.id);

      console.log(`  Copied ${pairedVariants.length} variants`);
      fixed++;
    }
  }

  console.log(`\n=== FIXED ${fixed} SCENES ===`);
}

fix();
