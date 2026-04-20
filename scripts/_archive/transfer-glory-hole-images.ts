import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get images from cunnilingus (was active as glory-hole-m-gives)
  const { data: source } = await supabase
    .from('scenes')
    .select('image_url, image_variants')
    .eq('slug', 'glory-hole-cunnilingus')
    .single();

  if (!source) {
    console.log('❌ Source scene not found');
    return;
  }

  console.log('Source (glory-hole-cunnilingus):');
  console.log('  image_url:', source.image_url);
  console.log('  variants:', source.image_variants?.length || 0);

  // Transfer to blowjob and activate it
  const { error: updateError } = await supabase
    .from('scenes')
    .update({
      image_url: source.image_url,
      image_variants: source.image_variants,
      is_active: true,
    })
    .eq('slug', 'glory-hole-blowjob');

  if (updateError) {
    console.log('❌ Error updating blowjob:', updateError.message);
    return;
  }

  console.log('✅ Transferred images to glory-hole-blowjob and activated');

  // Also update give/receive variants
  for (const suffix of ['-give', '-receive']) {
    const { data: srcVariant } = await supabase
      .from('scenes')
      .select('image_url, image_variants')
      .eq('slug', `glory-hole-cunnilingus${suffix}`)
      .single();

    if (srcVariant) {
      await supabase
        .from('scenes')
        .update({
          image_url: srcVariant.image_url,
          image_variants: srcVariant.image_variants,
          is_active: true,
        })
        .eq('slug', `glory-hole-blowjob${suffix}`);
      console.log(`✅ Transferred glory-hole-blowjob${suffix}`);
    }
  }

  // Deactivate cunnilingus scenes (optional - uncomment if needed)
  // await supabase.from('scenes').update({ is_active: false }).ilike('slug', 'glory-hole-cunnilingus%');
  // console.log('✅ Deactivated glory-hole-cunnilingus scenes');
}

run();
