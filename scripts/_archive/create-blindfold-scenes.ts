import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get existing blindfold scene for reference
  const { data: existingScene } = await supabase
    .from('scenes')
    .select('*')
    .eq('slug', 'blindfold')
    .single();

  if (!existingScene) {
    console.error('Existing blindfold scene not found');
    return;
  }

  console.log('Reference scene:', existingScene.slug);
  console.log('Category:', existingScene.category);
  console.log('Tags:', existingScene.tags);

  const ai_context = {
    tests_primary: ['blindfold', 'sensory_deprivation', 'trust'],
    tests_secondary: ['surprise', 'anticipation', 'control']
  };

  const newScenes = [
    {
      slug: 'blindfold-on-him',
      category: existingScene.category,
      tags: existingScene.tags || ['blindfold', 'sensory_deprivation', 'trust', 'surprise'],
      title: { ru: 'Повязка на глаза', en: 'Blindfold' },
      subtitle: { ru: 'Он не видит, но чувствует', en: 'He can\'t see, but feels' },
      intensity: 2,
      ai_context,
      user_description: {
        ru: 'Мужчина с завязанными глазами — полностью в твоей власти',
        en: 'Man blindfolded — completely at your mercy'
      },
      generation_prompt: 'intimate couple, man wearing silk blindfold, woman in control, sensual atmosphere, soft lighting, bedroom setting',
      is_active: true,
      priority: existingScene.priority,
    },
    {
      slug: 'blindfold-on-her',
      category: existingScene.category,
      tags: existingScene.tags || ['blindfold', 'sensory_deprivation', 'trust', 'surprise'],
      title: { ru: 'Повязка на глаза', en: 'Blindfold' },
      subtitle: { ru: 'Она не видит, но чувствует', en: 'She can\'t see, but feels' },
      intensity: 2,
      ai_context,
      user_description: {
        ru: 'Женщина с завязанными глазами — обострённые ощущения',
        en: 'Woman blindfolded — heightened sensations'
      },
      generation_prompt: 'intimate couple, woman wearing silk blindfold, man in control, sensual atmosphere, soft lighting, bedroom setting',
      is_active: true,
      priority: existingScene.priority,
    },
  ];

  console.log('\nCreating scenes...');

  for (const scene of newScenes) {
    const { data, error } = await supabase
      .from('scenes')
      .upsert(scene, { onConflict: 'slug' })
      .select('slug, id');

    if (error) {
      console.error('Error creating', scene.slug, ':', error.message);
    } else {
      console.log('Created:', data?.[0]?.slug, '->', data?.[0]?.id);
    }
  }

  // Set up sharing: both new scenes share images from main blindfold
  console.log('\nSetting up image sharing...');

  const { data: updated, error: updateError } = await supabase
    .from('scenes')
    .update({ shared_images_with: existingScene.id })
    .in('slug', ['blindfold-on-him', 'blindfold-on-her'])
    .select('slug, shared_images_with');

  if (updateError) {
    console.error('Error setting sharing:', updateError.message);
  } else {
    console.log('Sharing set:');
    for (const s of updated || []) {
      console.log('  ', s.slug, '-> shared from blindfold');
    }
  }
}

run();
