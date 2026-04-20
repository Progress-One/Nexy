/**
 * Fix: Deactivate gay scenes by checking generation_prompt content
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('Checking for gay scenes by prompt keywords...\n');

  const gayKeywords = ['yaoi', 'bara', 'male/male', '2boys', 'yuri', 'female/female', '2girls'];

  const { data: scenes, error: fetchError } = await supabase
    .from('scenes')
    .select('id, slug, generation_prompt, is_active')
    .eq('is_active', true);

  if (fetchError) {
    console.error('Fetch error:', fetchError.message);
    return;
  }

  console.log(`Total active scenes: ${scenes?.length || 0}`);

  const toDeactivate = scenes?.filter(s => {
    const prompt = (s.generation_prompt || '').toLowerCase();
    return gayKeywords.some(kw => prompt.includes(kw));
  }) || [];

  console.log(`\nFound ${toDeactivate.length} gay scenes to deactivate:\n`);

  for (const s of toDeactivate) {
    console.log(` - ${s.slug}`);
  }

  if (toDeactivate.length > 0) {
    const ids = toDeactivate.map(s => s.id);
    const { error } = await supabase
      .from('scenes')
      .update({ is_active: false })
      .in('id', ids);

    if (error) {
      console.error('\nUpdate error:', error.message);
    } else {
      console.log(`\n✓ Deactivated ${toDeactivate.length} scenes`);
    }
  } else {
    console.log('\nNo gay scenes found to deactivate.');
  }
}

main().catch(console.error);
