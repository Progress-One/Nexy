import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Deactivate edging scenes
  const { data: edging } = await supabase
    .from('scenes')
    .select('id, slug')
    .ilike('slug', '%edging%')
    .eq('is_active', true);

  console.log('Edging scenes to deactivate:', edging?.map(s => s.slug));

  if (edging && edging.length > 0) {
    await supabase
      .from('scenes')
      .update({ is_active: false })
      .in('id', edging.map(s => s.id));
    console.log('Deactivated', edging.length, 'edging scenes');
  }

  // List ruined-orgasm scenes
  const { data: ruined } = await supabase
    .from('scenes')
    .select('slug, is_active')
    .ilike('slug', '%ruined%');

  console.log('\nRuined orgasm scenes (were 6):');
  for (const s of ruined || []) {
    console.log(' -', s.slug);
  }
}
run();
