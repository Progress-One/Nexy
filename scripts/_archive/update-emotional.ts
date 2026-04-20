import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const newUserDescription = {
    ru: 'Глубокая эмоциональная близость во время секса. Вы смотрите друг другу в глаза, чувствуете связь и нежность.',
    en: 'Deep emotional intimacy during sex. You look into each other\'s eyes, feeling connection and tenderness.'
  };

  const { data, error } = await supabase
    .from('scenes')
    .update({ user_description: newUserDescription })
    .eq('slug', 'emotional-sex')
    .select('slug, user_description');

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Updated:', JSON.stringify(data, null, 2));
  }
}

run();
