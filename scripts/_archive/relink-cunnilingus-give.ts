import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function relink() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug')
    .in('slug', ['cunnilingus-give', 'cunnilingus-receive', 'onboarding-oral-give-hetero-m']);

  const give = scenes?.find(s => s.slug === 'cunnilingus-give');
  const receive = scenes?.find(s => s.slug === 'cunnilingus-receive');
  const source = scenes?.find(s => s.slug === 'onboarding-oral-give-hetero-m');

  console.log('Found:', { give: !!give, receive: !!receive, source: !!source });

  if (give && source) {
    await supabase.from('scenes').update({ shared_images_with: source.id }).eq('id', give.id);
    console.log('Linked cunnilingus-give -> onboarding-oral-give-hetero-m');
  }
  if (receive && source) {
    await supabase.from('scenes').update({ shared_images_with: source.id }).eq('id', receive.id);
    console.log('Linked cunnilingus-receive -> onboarding-oral-give-hetero-m');
  }
}

relink();
