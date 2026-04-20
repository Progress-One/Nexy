import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  // Count scenes without images
  const { count: noImage } = await supabase
    .from('scenes')
    .select('*', { count: 'exact', head: true })
    .or('image_url.is.null,image_url.eq.');

  // Count scenes without images AND without prompt
  const { count: noImageNoPrompt } = await supabase
    .from('scenes')
    .select('*', { count: 'exact', head: true })
    .or('image_url.is.null,image_url.eq.')
    .or('generation_prompt.is.null,generation_prompt.eq.');

  // Count scenes without images BUT with prompt
  const { count: noImageWithPrompt } = await supabase
    .from('scenes')
    .select('*', { count: 'exact', head: true })
    .or('image_url.is.null,image_url.eq.')
    .not('generation_prompt', 'is', null)
    .neq('generation_prompt', '');

  console.log('Scenes without image_url:', noImage);
  console.log('Scenes without image AND without prompt:', noImageNoPrompt);
  console.log('Scenes without image BUT with prompt:', noImageWithPrompt);
}

check();
