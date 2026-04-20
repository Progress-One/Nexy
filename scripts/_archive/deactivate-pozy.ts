import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Search all active scenes for "positions" or "позы"
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, role_direction, user_description')
    .eq('is_active', true);

  console.log('Total active scenes:', scenes?.length || 0);

  const matching = (scenes || []).filter(s => {
    const desc = s.user_description as any;
    const ru = desc?.ru?.toLowerCase() || '';
    const en = desc?.en?.toLowerCase() || '';
    return ru.includes('позы') || en.includes('positions') || en.includes('missionary');
  });

  console.log('\nMatching scenes:');
  for (const s of matching) {
    const desc = s.user_description as any;
    console.log(' -', s.slug, '|', s.role_direction);
    console.log('   RU:', desc?.ru?.substring(0, 60));
    console.log('   EN:', desc?.en?.substring(0, 60));
  }

  // Deactivate the matching scene(s)
  if (matching.length > 0) {
    const ids = matching.map(s => s.id);
    console.log('\nDeactivating', ids.length, 'scene(s)...');

    const { error } = await supabase
      .from('scenes')
      .update({ is_active: false })
      .in('id', ids);

    if (error) {
      console.log('Error:', error);
    } else {
      console.log('Done!');
    }
  }
}
run();
