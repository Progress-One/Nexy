import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const category = 'verbal';
  const tags = ['verbal', 'moaning', 'vocal', 'sounds', 'screaming'];

  const ai_context = {
    tests_primary: ['moaning', 'vocal', 'sounds'],
    tests_secondary: ['uninhibited', 'expression', 'passion']
  };

  // Одна сцена без give/receive - взаимная вокализация
  const newScene = {
    slug: 'moaning-and-screaming',
    category,
    tags,
    role_direction: 'mutual',
    title: { ru: 'Стоны и крики', en: 'Moaning & Screaming' },
    subtitle: { ru: 'Не сдерживаться', en: 'Let go completely' },
    intensity: 2,
    ai_context,
    user_description: {
      ru: 'Громкие стоны и крики удовольствия — не сдерживать себя',
      en: 'Loud moans and screams of pleasure — letting go completely'
    },
    generation_prompt: 'intimate couple moment, expressive faces showing pleasure, passionate atmosphere, artistic sensual',
    is_active: true,
    priority: 50,
  };

  console.log('Создание сцены moaning-and-screaming...\n');

  const { data, error } = await supabase
    .from('scenes')
    .upsert(newScene, { onConflict: 'slug' })
    .select('slug, id');

  if (error) {
    console.error('Error creating scene:', error.message);
  } else {
    console.log('Created:', data?.[0]?.slug, '| ID:', data?.[0]?.id);
  }

  console.log('\nГотово!');
}

run();
