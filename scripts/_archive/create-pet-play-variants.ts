import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const category = 'pet-play';
  const tags = ['pet_play', 'collar', 'ears', 'submission', 'roleplay'];

  const ai_context = {
    tests_primary: ['pet_play', 'submission', 'collar'],
    tests_secondary: ['roleplay', 'power_exchange', 'humiliation']
  };

  const newScenes = [
    // Он питомец (f_to_m - она хозяйка, он pet)
    {
      slug: 'pet-play-he-is-pet-give',
      category,
      tags,
      role_direction: 'f_to_m',
      title: { ru: 'Pet play', en: 'Pet Play' },
      subtitle: { ru: 'Он питомец', en: 'He is pet' },
      intensity: 3,
      ai_context,
      user_description: {
        ru: 'Он на четвереньках в ошейнике и ушках. Ты стоишь рядом, гладишь его по голове',
        en: 'He is on all fours wearing a collar and ears. You stand nearby, petting his head'
      },
      generation_prompt: 'naked man with dog ears and collar on all fours, woman in lingerie holding leash, bedroom',
      is_active: true,
      priority: 50,
    },
    {
      slug: 'pet-play-he-is-pet-receive',
      category,
      tags,
      role_direction: 'f_to_m',
      title: { ru: 'Pet play', en: 'Pet Play' },
      subtitle: { ru: 'Он питомец', en: 'He is pet' },
      intensity: 3,
      ai_context,
      user_description: {
        ru: 'Ты на четвереньках в ошейнике и ушках. Она стоит рядом, гладит тебя по голове',
        en: 'You are on all fours wearing a collar and ears. She stands nearby, petting your head'
      },
      generation_prompt: 'naked man with dog ears and collar on all fours, woman in lingerie holding leash, bedroom',
      is_active: true,
      priority: 50,
    },
    // Она питомец (m_to_f - он хозяин, она pet)
    {
      slug: 'pet-play-she-is-pet-give',
      category,
      tags,
      role_direction: 'm_to_f',
      title: { ru: 'Pet play', en: 'Pet Play' },
      subtitle: { ru: 'Она питомец', en: 'She is pet' },
      intensity: 3,
      ai_context,
      user_description: {
        ru: 'Она на четвереньках в ошейнике, ушках и хвостике. Ты стоишь рядом, гладишь её',
        en: 'She is on all fours wearing collar, ears and tail. You stand nearby, petting her'
      },
      generation_prompt: 'naked woman with cat ears and collar on all fours, tail plug, man holding leash, bedroom',
      is_active: true,
      priority: 50,
    },
    {
      slug: 'pet-play-she-is-pet-receive',
      category,
      tags,
      role_direction: 'm_to_f',
      title: { ru: 'Pet play', en: 'Pet Play' },
      subtitle: { ru: 'Она питомец', en: 'She is pet' },
      intensity: 3,
      ai_context,
      user_description: {
        ru: 'Ты на четвереньках в ошейнике, ушках и хвостике. Он стоит рядом, гладит тебя',
        en: 'You are on all fours wearing collar, ears and tail. He stands nearby, petting you'
      },
      generation_prompt: 'naked woman with cat ears and collar on all fours, tail plug, man holding leash, bedroom',
      is_active: true,
      priority: 50,
    },
  ];

  console.log('Создание сцен pet-play (4 шт)...\n');

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

  // Пара 1: he is pet
  const heIsPetGive = createdIds['pet-play-he-is-pet-give'];
  const heIsPetReceive = createdIds['pet-play-he-is-pet-receive'];
  await supabase.from('scenes').update({ paired_with: heIsPetReceive }).eq('id', heIsPetGive);
  await supabase.from('scenes').update({ paired_with: heIsPetGive }).eq('id', heIsPetReceive);
  console.log('Paired: pet-play-he-is-pet-give ↔ pet-play-he-is-pet-receive');

  // Пара 2: she is pet
  const sheIsPetGive = createdIds['pet-play-she-is-pet-give'];
  const sheIsPetReceive = createdIds['pet-play-she-is-pet-receive'];
  await supabase.from('scenes').update({ paired_with: sheIsPetReceive }).eq('id', sheIsPetGive);
  await supabase.from('scenes').update({ paired_with: sheIsPetGive }).eq('id', sheIsPetReceive);
  console.log('Paired: pet-play-she-is-pet-give ↔ pet-play-she-is-pet-receive');

  // Получить ID оригинальных сцен для shared_images_with
  console.log('\nНастройка shared_images_with...');
  const { data: originals } = await supabase
    .from('scenes')
    .select('id, slug')
    .in('slug', ['pet-play-he-is-pet', 'pet-play-she-is-pet']);

  const heIsPetOriginalId = originals?.find(x => x.slug === 'pet-play-he-is-pet')?.id;
  const sheIsPetOriginalId = originals?.find(x => x.slug === 'pet-play-she-is-pet')?.id;

  if (heIsPetOriginalId) {
    await supabase.from('scenes').update({ shared_images_with: heIsPetOriginalId }).eq('slug', 'pet-play-he-is-pet-give');
    await supabase.from('scenes').update({ shared_images_with: heIsPetOriginalId }).eq('slug', 'pet-play-he-is-pet-receive');
    console.log('Shared images: pet-play-he-is-pet → give & receive');
  }

  if (sheIsPetOriginalId) {
    await supabase.from('scenes').update({ shared_images_with: sheIsPetOriginalId }).eq('slug', 'pet-play-she-is-pet-give');
    await supabase.from('scenes').update({ shared_images_with: sheIsPetOriginalId }).eq('slug', 'pet-play-she-is-pet-receive');
    console.log('Shared images: pet-play-she-is-pet → give & receive');
  }

  // Деактивировать оригинальные сцены
  console.log('\nДеактивация оригинальных сцен...');
  const { data: deactivated } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .in('slug', ['pet-play-he-is-pet', 'pet-play-she-is-pet'])
    .select('slug');

  deactivated?.forEach(s => console.log('Deactivated:', s.slug));

  console.log('\nГотово!');
}

run();
