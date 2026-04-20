import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const category = 'solo-mutual';
  const tags = ['masturbation', 'watching', 'solo'];

  const ai_context = {
    tests_primary: ['masturbation', 'watching', 'exhibitionism'],
    tests_secondary: ['voyeurism', 'intimacy', 'solo']
  };

  const newScenes = [
    // Он мастурбирует перед ней (m_to_f)
    {
      slug: 'masturbation-he-for-her-give',
      category,
      tags,
      role_direction: 'm_to_f',
      title: { ru: 'Мастурбация', en: 'Masturbation' },
      subtitle: { ru: 'Он показывает ей', en: 'He shows her' },
      intensity: 2,
      ai_context,
      user_description: {
        ru: 'Он мастурбирует перед тобой — ты смотришь, как он ласкает себя',
        en: 'He masturbates in front of you — you watch him touch himself'
      },
      generation_prompt: 'man touching himself while woman watches, intimate bedroom, soft lighting',
      is_active: true,
      priority: 50,
    },
    {
      slug: 'masturbation-he-for-her-receive',
      category,
      tags,
      role_direction: 'm_to_f',
      title: { ru: 'Мастурбация', en: 'Masturbation' },
      subtitle: { ru: 'Он показывает ей', en: 'He shows her' },
      intensity: 2,
      ai_context,
      user_description: {
        ru: 'Ты мастурбируешь перед ней — она смотрит, как ты ласкаешь себя',
        en: 'You masturbate in front of her — she watches you touch yourself'
      },
      generation_prompt: 'man touching himself while woman watches, intimate bedroom, soft lighting',
      is_active: true,
      priority: 50,
    },
    // Она мастурбирует перед ним (f_to_m)
    {
      slug: 'masturbation-she-for-him-give',
      category,
      tags,
      role_direction: 'f_to_m',
      title: { ru: 'Мастурбация', en: 'Masturbation' },
      subtitle: { ru: 'Она показывает ему', en: 'She shows him' },
      intensity: 2,
      ai_context,
      user_description: {
        ru: 'Она мастурбирует перед тобой — ты смотришь, как она ласкает себя',
        en: 'She masturbates in front of you — you watch her touch herself'
      },
      generation_prompt: 'woman touching herself while man watches, intimate bedroom, soft lighting',
      is_active: true,
      priority: 50,
    },
    {
      slug: 'masturbation-she-for-him-receive',
      category,
      tags,
      role_direction: 'f_to_m',
      title: { ru: 'Мастурбация', en: 'Masturbation' },
      subtitle: { ru: 'Она показывает ему', en: 'She shows him' },
      intensity: 2,
      ai_context,
      user_description: {
        ru: 'Ты мастурбируешь перед ним — он смотрит, как ты ласкаешь себя',
        en: 'You masturbate in front of him — he watches you touch yourself'
      },
      generation_prompt: 'woman touching herself while man watches, intimate bedroom, soft lighting',
      is_active: true,
      priority: 50,
    },
  ];

  console.log('Создание сцен masturbation (4 шт)...\n');

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

  // Пара 1: he for her
  const heForHerGive = createdIds['masturbation-he-for-her-give'];
  const heForHerReceive = createdIds['masturbation-he-for-her-receive'];
  await supabase.from('scenes').update({ paired_with: heForHerReceive }).eq('id', heForHerGive);
  await supabase.from('scenes').update({ paired_with: heForHerGive }).eq('id', heForHerReceive);
  console.log('Paired: masturbation-he-for-her-give ↔ masturbation-he-for-her-receive');

  // Пара 2: she for him
  const sheForHimGive = createdIds['masturbation-she-for-him-give'];
  const sheForHimReceive = createdIds['masturbation-she-for-him-receive'];
  await supabase.from('scenes').update({ paired_with: sheForHimReceive }).eq('id', sheForHimGive);
  await supabase.from('scenes').update({ paired_with: sheForHimGive }).eq('id', sheForHimReceive);
  console.log('Paired: masturbation-she-for-him-give ↔ masturbation-she-for-him-receive');

  // Деактивировать оригинальную сцену
  console.log('\nДеактивация оригинальной сцены mutual-masturbation...');
  const { data: deactivated } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .eq('slug', 'mutual-masturbation')
    .select('slug');

  if (deactivated?.length) {
    console.log('Deactivated:', deactivated[0].slug);
  }

  console.log('\nГотово!');
}

run();
