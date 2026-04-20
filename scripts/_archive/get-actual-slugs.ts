import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const patterns = [
    'choking', 'whipping', 'somnophilia', 'glory-hole', 'breath-play',
    'knife-play', 'mummification', 'fisting', 'threesome', 'cuckold',
    'voyeurism', 'exhibitionism', 'doctor', 'service-role', 'taboo',
    'blindfold', 'ice-play', 'feather', 'cock-ring', 'heels', 'latex',
    'torn', 'filming', 'sexting', 'joi', 'romantic-sex', 'emotional',
    'aftercare', 'first-time', 'makeup-sex', 'angry-sex'
  ];

  for (const p of patterns) {
    const { data } = await supabase
      .from('scenes')
      .select('slug')
      .ilike('slug', `%${p}%`)
      .eq('is_active', true);

    const base = data?.filter(s => !s.slug.includes('-give') && !s.slug.includes('-receive'));
    if (base && base.length > 0) {
      console.log(`${p}: ${base.map(s => s.slug).join(', ')}`);
    } else {
      console.log(`${p}: NOT FOUND`);
    }
  }
}

run();
