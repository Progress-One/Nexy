import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get images from base scene
  const { data: base } = await supabase
    .from('scenes')
    .select('image_url, image_variants')
    .eq('slug', 'glory-hole-blowjob')
    .single();

  if (!base) {
    console.log('❌ Base scene not found');
    return;
  }

  console.log('Source (glory-hole-blowjob):');
  console.log('  image_url:', base.image_url ? 'yes' : 'no');

  // Transfer to -give and -receive
  for (const suffix of ['-give', '-receive']) {
    const { error } = await supabase
      .from('scenes')
      .update({
        image_url: base.image_url,
        image_variants: base.image_variants,
      })
      .eq('slug', `glory-hole-blowjob${suffix}`);

    if (error) {
      console.log(`❌ Error updating glory-hole-blowjob${suffix}:`, error.message);
    } else {
      console.log(`✅ Transferred to glory-hole-blowjob${suffix}`);
    }
  }

  // Deactivate base scene
  const { error: deactivateError } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .eq('slug', 'glory-hole-blowjob');

  if (deactivateError) {
    console.log('❌ Error deactivating base:', deactivateError.message);
  } else {
    console.log('✅ Deactivated glory-hole-blowjob (base)');
  }

  // Verify final state
  const { data: final } = await supabase
    .from('scenes')
    .select('slug, is_active, image_url')
    .ilike('slug', 'glory-hole-blowjob%');

  console.log('\nFinal state:');
  for (const s of final || []) {
    const hasImage = s.image_url ? '📷' : '  ';
    const status = s.is_active ? '✅' : '❌';
    console.log(`  ${status} ${hasImage} ${s.slug}`);
  }
}

run();
