import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Check how scene_responses are structured for paired scenes
  const { data: responses } = await supabase
    .from('scene_responses')
    .select('scene_slug, elements_selected, answer')
    .or('scene_slug.ilike.%give,scene_slug.ilike.%receive')
    .limit(5);

  console.log('Sample scene_responses for give/receive:\n');
  for (const r of responses || []) {
    console.log(r.scene_slug);
    console.log('  elements_selected:', r.elements_selected);
    console.log('  answer:', JSON.stringify(r.answer)?.substring(0, 100));
    console.log('');
  }

  // Check tag_preferences for related tags
  const { data: tagPrefs } = await supabase
    .from('tag_preferences')
    .select('tag_ref, interest_level, role_preference')
    .limit(10);

  console.log('\nSample tag_preferences:\n');
  for (const tp of tagPrefs || []) {
    console.log(tp.tag_ref, '- interest:', tp.interest_level, '- role:', tp.role_preference);
  }
}

run();
