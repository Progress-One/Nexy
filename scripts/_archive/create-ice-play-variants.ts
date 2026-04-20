import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const category = 'sensory';
  const tags = ['ice', 'temperature', 'sensory', 'cold', 'sensation_play'];

  const ai_context = {
    tests_primary: ['ice', 'temperature', 'sensory'],
    tests_secondary: ['cold', 'contrast', 'sensation']
  };

  const newScenes = [
    // Он водит льдом по ней (m_to_f)
    {
      slug: 'ice-play-he-on-her-give',
      category,
      tags,
      role_direction: 'm_to_f',
      title: { ru: 'Игра со льдом', en: 'Ice Play' },
      subtitle: { ru: 'Он на ней', en: 'He on her' },
      intensity: 2,
      ai_context,
      user_description: {
        ru: 'Он проводит кубиком льда по твоему телу — холод и мурашки',
        en: 'He traces an ice cube along your body — cold and shivers'
      },
      generation_prompt: 'naked woman lying on bed, man tracing ice cube along her body, soft lighting',
      is_active: true,
      priority: 50,
    },
    {
      slug: 'ice-play-he-on-her-receive',
      category,
      tags,
      role_direction: 'm_to_f',
      title: { ru: 'Игра со льдом', en: 'Ice Play' },
      subtitle: { ru: 'Он на ней', en: 'He on her' },
      intensity: 2,
      ai_context,
      user_description: {
        ru: 'Ты проводишь кубиком льда по её телу — она вздрагивает от холода',
        en: 'You trace an ice cube along her body — she shivers from the cold'
      },
      generation_prompt: 'naked woman lying on bed, man tracing ice cube along her body, soft lighting',
      is_active: true,
      priority: 50,
    },
    // Она водит льдом по нему (f_to_m)
    {
      slug: 'ice-play-she-on-him-give',
      category,
      tags,
      role_direction: 'f_to_m',
      title: { ru: 'Игра со льдом', en: 'Ice Play' },
      subtitle: { ru: 'Она на нём', en: 'She on him' },
      intensity: 2,
      ai_context,
      user_description: {
        ru: 'Она проводит кубиком льда по твоему телу — холод и мурашки',
        en: 'She traces an ice cube along your body — cold and shivers'
      },
      generation_prompt: 'naked man lying on bed, woman tracing ice cube along his body, soft lighting',
      is_active: true,
      priority: 50,
    },
    {
      slug: 'ice-play-she-on-him-receive',
      category,
      tags,
      role_direction: 'f_to_m',
      title: { ru: 'Игра со льдом', en: 'Ice Play' },
      subtitle: { ru: 'Она на нём', en: 'She on him' },
      intensity: 2,
      ai_context,
      user_description: {
        ru: 'Ты проводишь кубиком льда по его телу — он вздрагивает от холода',
        en: 'You trace an ice cube along his body — he shivers from the cold'
      },
      generation_prompt: 'naked man lying on bed, woman tracing ice cube along his body, soft lighting',
      is_active: true,
      priority: 50,
    },
  ];

  console.log('Создание сцен ice-play (4 шт)...\n');

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

  // Пара 1: he on her
  const heOnHerGive = createdIds['ice-play-he-on-her-give'];
  const heOnHerReceive = createdIds['ice-play-he-on-her-receive'];
  await supabase.from('scenes').update({ paired_with: heOnHerReceive }).eq('id', heOnHerGive);
  await supabase.from('scenes').update({ paired_with: heOnHerGive }).eq('id', heOnHerReceive);
  console.log('Paired: ice-play-he-on-her-give ↔ ice-play-he-on-her-receive');

  // Пара 2: she on him
  const sheOnHimGive = createdIds['ice-play-she-on-him-give'];
  const sheOnHimReceive = createdIds['ice-play-she-on-him-receive'];
  await supabase.from('scenes').update({ paired_with: sheOnHimReceive }).eq('id', sheOnHimGive);
  await supabase.from('scenes').update({ paired_with: sheOnHimGive }).eq('id', sheOnHimReceive);
  console.log('Paired: ice-play-she-on-him-give ↔ ice-play-she-on-him-receive');

  // Деактивировать оригинальную сцену
  console.log('\nДеактивация оригинальной сцены ice-play...');
  const { data: deactivated } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .eq('slug', 'ice-play')
    .select('slug');

  if (deactivated?.length) {
    console.log('Deactivated:', deactivated[0].slug);
  }

  console.log('\nГотово!');
}

run();
