import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get existing blindfold-on-her for reference (has images)
  const { data: existingScene } = await supabase
    .from('scenes')
    .select('*')
    .eq('slug', 'blindfold-on-her')
    .single();

  if (!existingScene) {
    console.error('Existing blindfold-on-her scene not found');
    return;
  }

  console.log('Reference scene:', existingScene.slug);
  console.log('Category:', existingScene.category);
  console.log('Tags:', existingScene.tags);

  const newScenes = [
    {
      slug: 'blindfold-on-him-give',
      category: existingScene.category,
      tags: existingScene.tags,
      user_description: {
        ru: 'Завязать ему глаза — он полностью в твоей власти',
        en: 'Blindfold him — he\'s completely at your mercy'
      },
      generation_prompt: 'intimate couple, woman putting silk blindfold on man, sensual atmosphere, soft lighting, bedroom setting',
      is_active: true,
      priority: existingScene.priority,
    },
    {
      slug: 'blindfold-on-him-receive',
      category: existingScene.category,
      tags: existingScene.tags,
      user_description: {
        ru: 'Он завязывает тебе глаза — обострённые ощущения',
        en: 'He blindfolds you — heightened sensations'
      },
      generation_prompt: 'intimate couple, man putting silk blindfold on woman, sensual atmosphere, soft lighting, bedroom setting',
      is_active: true,
      priority: existingScene.priority,
    },
    {
      slug: 'blindfold-on-her-give',
      category: existingScene.category,
      tags: existingScene.tags,
      user_description: {
        ru: 'Завязать ей глаза — она полностью в твоей власти',
        en: 'Blindfold her — she\'s completely at your mercy'
      },
      generation_prompt: 'intimate couple, man putting silk blindfold on woman, sensual atmosphere, soft lighting, bedroom setting',
      is_active: true,
      priority: existingScene.priority,
    },
    {
      slug: 'blindfold-on-her-receive',
      category: existingScene.category,
      tags: existingScene.tags,
      user_description: {
        ru: 'Она завязывает тебе глаза — обострённые ощущения',
        en: 'She blindfolds you — heightened sensations'
      },
      generation_prompt: 'intimate couple, woman putting silk blindfold on man, sensual atmosphere, soft lighting, bedroom setting',
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

  // Delete old scenes without give/receive
  console.log('\nDeleting old scenes...');
  const { error: deleteError } = await supabase
    .from('scenes')
    .delete()
    .in('slug', ['blindfold-on-him', 'blindfold-on-her']);

  if (deleteError) {
    console.error('Error deleting:', deleteError.message);
  } else {
    console.log('Deleted: blindfold-on-him, blindfold-on-her');
  }

  // Verify
  console.log('\n--- Verification ---');
  const { data: remaining } = await supabase
    .from('scenes')
    .select('slug, is_active')
    .ilike('slug', '%blindfold%')
    .order('slug');

  for (const s of remaining || []) {
    console.log(s.is_active ? '[active]' : '[inactive]', s.slug);
  }
}

run();
