import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function dump() {
  const { data } = await supabase
    .from('scenes')
    .select('id, slug, image_prompt, user_description')
    .or('image_url.is.null,image_url.eq.')
    .not('image_prompt', 'is', null)
    .order('slug');

  const output = data?.map(s => {
    const desc = s.user_description as any;
    return {
      id: s.id,
      slug: s.slug,
      old: s.image_prompt,
      essence: desc?.en || desc?.ru || '',
      new: '' // to be filled manually
    };
  }) || [];

  fs.writeFileSync('prompts-to-fix.json', JSON.stringify(output, null, 2));
  console.log(`Saved ${output.length} scenes to prompts-to-fix.json`);
}

dump();
