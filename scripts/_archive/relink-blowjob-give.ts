import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function relink() {
  // Get scenes
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, image_url, image_variants')
    .in('slug', ['blowjob-give', 'blowjob-receive', 'onboarding-oral-give-hetero-f']);

  const blowjobGive = scenes?.find(s => s.slug === 'blowjob-give');
  const blowjobReceive = scenes?.find(s => s.slug === 'blowjob-receive');
  const source = scenes?.find(s => s.slug === 'onboarding-oral-give-hetero-f');

  if (!blowjobGive || !blowjobReceive || !source) {
    console.log('Scenes not found!');
    console.log('blowjobGive:', !!blowjobGive);
    console.log('blowjobReceive:', !!blowjobReceive);
    console.log('source:', !!source);
    return;
  }

  console.log('source variants:', source.image_variants?.length || 0);

  // Link blowjob-give -> source
  const { error: err1 } = await supabase
    .from('scenes')
    .update({ shared_images_with: source.id })
    .eq('id', blowjobGive.id);

  if (err1) {
    console.log('Error linking blowjob-give:', err1.message);
  } else {
    console.log('Linked blowjob-give -> onboarding-oral-give-hetero-f');
  }

  // Link blowjob-receive -> source (same images work for receive too)
  const { error: err2 } = await supabase
    .from('scenes')
    .update({ shared_images_with: source.id })
    .eq('id', blowjobReceive.id);

  if (err2) {
    console.log('Error linking blowjob-receive:', err2.message);
  } else {
    console.log('Linked blowjob-receive -> onboarding-oral-give-hetero-f');
  }
}

relink();
