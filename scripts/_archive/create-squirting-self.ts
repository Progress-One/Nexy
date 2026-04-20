import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const category = 'body-fluids';
  const tags = ['squirting', 'squirt', 'female_orgasm', 'gushing', 'wet', 'intense_orgasm'];

  const ai_context = {
    tests_primary: ['squirting', 'female_orgasm', 'gushing'],
    tests_secondary: ['g_spot', 'intense_pleasure', 'wet']
  };

  const newScenes = [
    {
      slug: 'squirting-on-self-give',
      category,
      tags,
      role_direction: 'f_to_m',
      title: { ru: 'Сквирт', en: 'Squirting' },
      subtitle: { ru: 'На себя', en: 'On self' },
      intensity: 3,
      ai_context,
      user_description: {
        ru: 'Ты сквиртуешь — на себя, на простыни, лежишь в луже своего удовольствия',
        en: 'You squirt — on yourself, on the sheets, lying in a puddle of your pleasure'
      },
      generation_prompt: 'woman lying on bed after intense orgasm, wet sheets, satisfied expression, intimate atmosphere',
      is_active: true,
      priority: 50,
    },
    {
      slug: 'squirting-on-self-receive',
      category,
      tags,
      role_direction: 'f_to_m',
      title: { ru: 'Сквирт', en: 'Squirting' },
      subtitle: { ru: 'На себя', en: 'On self' },
      intensity: 3,
      ai_context,
      user_description: {
        ru: 'Она сквиртует — на себя, на простыни, лежит в луже своего удовольствия. Ты смотришь.',
        en: 'She squirts — on herself, on the sheets, lying in a puddle of her pleasure. You watch.'
      },
      generation_prompt: 'woman lying on bed after intense orgasm, wet sheets, satisfied expression, intimate atmosphere',
      is_active: true,
      priority: 50,
    },
  ];

  console.log('Создание сцен squirting-on-self...\n');

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

  const giveId = createdIds['squirting-on-self-give'];
  const receiveId = createdIds['squirting-on-self-receive'];

  await supabase.from('scenes').update({ paired_with: receiveId }).eq('id', giveId);
  await supabase.from('scenes').update({ paired_with: giveId }).eq('id', receiveId);

  console.log('Paired: squirting-on-self-give ↔ squirting-on-self-receive');

  console.log('\nГотово!');
}

run();
