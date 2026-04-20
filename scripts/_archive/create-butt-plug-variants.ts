import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const category = 'toys';
  const tags = ['toys', 'butt_plug', 'anal', 'fullness'];

  const ai_context = {
    tests_primary: ['butt_plug', 'toys', 'anal'],
    tests_secondary: ['fullness', 'taboo', 'public_play']
  };

  const newScenes = [
    // Она носит пробку (m_to_f - он вставляет/видит, она носит)
    {
      slug: 'butt-plug-she-wears-give',
      category,
      tags,
      role_direction: 'm_to_f',
      title: { ru: 'Анальная пробка', en: 'Butt Plug' },
      subtitle: { ru: 'Она носит', en: 'She wears' },
      intensity: 3,
      ai_context,
      user_description: {
        ru: 'Ты носишь анальную пробку — он вставил её тебе или ты сама, а он любуется',
        en: 'You wear a butt plug — he inserted it or you did yourself, and he admires'
      },
      generation_prompt: 'naked woman on all fours on bed, small butt plug visible, dim bedroom lighting',
      is_active: true,
      priority: 50,
    },
    {
      slug: 'butt-plug-she-wears-receive',
      category,
      tags,
      role_direction: 'm_to_f',
      title: { ru: 'Анальная пробка', en: 'Butt Plug' },
      subtitle: { ru: 'Она носит', en: 'She wears' },
      intensity: 3,
      ai_context,
      user_description: {
        ru: 'Она носит анальную пробку — ты вставил её или она сама, а ты любуешься',
        en: 'She wears a butt plug — you inserted it or she did herself, and you admire'
      },
      generation_prompt: 'naked woman on all fours on bed, small butt plug visible, dim bedroom lighting',
      is_active: true,
      priority: 50,
    },
    // Он носит пробку (f_to_m - она вставляет/видит, он носит)
    {
      slug: 'butt-plug-he-wears-give',
      category,
      tags,
      role_direction: 'f_to_m',
      title: { ru: 'Анальная пробка', en: 'Butt Plug' },
      subtitle: { ru: 'Он носит', en: 'He wears' },
      intensity: 3,
      ai_context,
      user_description: {
        ru: 'Ты носишь анальную пробку — она вставила её тебе или ты сам, а она любуется',
        en: 'You wear a butt plug — she inserted it or you did yourself, and she admires'
      },
      generation_prompt: 'intimate couple, man with small butt plug, woman admiring, dim bedroom lighting',
      is_active: true,
      priority: 50,
    },
    {
      slug: 'butt-plug-he-wears-receive',
      category,
      tags,
      role_direction: 'f_to_m',
      title: { ru: 'Анальная пробка', en: 'Butt Plug' },
      subtitle: { ru: 'Он носит', en: 'He wears' },
      intensity: 3,
      ai_context,
      user_description: {
        ru: 'Он носит анальную пробку — ты вставила её или он сам, а ты любуешься',
        en: 'He wears a butt plug — you inserted it or he did himself, and you admire'
      },
      generation_prompt: 'intimate couple, man with small butt plug, woman admiring, dim bedroom lighting',
      is_active: true,
      priority: 50,
    },
  ];

  console.log('Создание сцен butt-plug (4 шт)...\n');

  const createdIds: Record<string, string> = {};

  for (const scene of newScenes) {
    const { data, error } = await supabase
      .from('scenes')
      .upsert(scene, { onConflict: 'slug' })
      .select('slug, id');

    if (error) {
      console.error('Error creating', scene.slug, ':', error.message);
    } else {
      createdIds[scene.slug] = data?.[0]?.id;
      console.log('Created:', data?.[0]?.slug);
    }
  }

  // Set up bidirectional paired_with
  console.log('\nНастройка paired_with...');

  // Пара 1: she wears
  const sheWearsGive = createdIds['butt-plug-she-wears-give'];
  const sheWearsReceive = createdIds['butt-plug-she-wears-receive'];
  await supabase.from('scenes').update({ paired_with: sheWearsReceive }).eq('id', sheWearsGive);
  await supabase.from('scenes').update({ paired_with: sheWearsGive }).eq('id', sheWearsReceive);
  console.log('Paired: butt-plug-she-wears-give ↔ butt-plug-she-wears-receive');

  // Пара 2: he wears
  const heWearsGive = createdIds['butt-plug-he-wears-give'];
  const heWearsReceive = createdIds['butt-plug-he-wears-receive'];
  await supabase.from('scenes').update({ paired_with: heWearsReceive }).eq('id', heWearsGive);
  await supabase.from('scenes').update({ paired_with: heWearsGive }).eq('id', heWearsReceive);
  console.log('Paired: butt-plug-he-wears-give ↔ butt-plug-he-wears-receive');

  // Деактивировать оригинальную сцену butt-plug
  console.log('\nДеактивация оригинальной сцены butt-plug...');
  const { data: deactivated } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .eq('slug', 'butt-plug')
    .select('slug');

  if (deactivated?.length) {
    console.log('Deactivated:', deactivated[0].slug);
  }

  console.log('\nГотово!');
}

run();
