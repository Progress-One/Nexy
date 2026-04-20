import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // ice-play-he-on-her-give: "Он проводит по твоему телу" = для женщины = f_to_m
  const { error: e1 } = await supabase
    .from('scenes')
    .update({ role_direction: 'f_to_m' })
    .eq('slug', 'ice-play-he-on-her-give');
  console.log(e1 ? 'Error: ' + e1.message : '✓ ice-play-he-on-her-give → f_to_m');

  // ice-play-she-on-him-give: "Она проводит по твоему телу" = для мужчины = m_to_f
  const { error: e2 } = await supabase
    .from('scenes')
    .update({ role_direction: 'm_to_f' })
    .eq('slug', 'ice-play-she-on-him-give');
  console.log(e2 ? 'Error: ' + e2.message : '✓ ice-play-she-on-him-give → m_to_f');
}
run();
