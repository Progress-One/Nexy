import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Delete old incorrectly named scenes
  console.log('Deleting old incorrectly named scenes...');
  const { error: deleteError } = await supabase
    .from('scenes')
    .delete()
    .ilike('slug', 'blindfold-on-%');

  if (deleteError) {
    console.error('Error deleting:', deleteError.message);
  } else {
    console.log('Deleted blindfold-on-* scenes');
  }

  // Create scenes with correct naming pattern per docs
  const category = 'sensory';
  const tags = ['blindfold', 'sensory_deprivation', 'trust', 'surprise'];

  const newScenes = [
    // Pair 1: M blindfolds F (she's blindfolded)
    {
      slug: 'blindfold-give-hetero-m',
      category,
      tags,
      role_direction: 'm_to_f',
      user_description: {
        ru: 'Завязать ей глаза — она полностью в твоей власти',
        en: 'Blindfold her — she\'s completely at your mercy'
      },
      generation_prompt: 'intimate couple, man putting silk blindfold on woman, sensual atmosphere, soft lighting, bedroom setting',
      is_active: true,
      priority: 50,
    },
    {
      slug: 'blindfold-receive-hetero-f',
      category,
      tags,
      role_direction: 'm_to_f',
      user_description: {
        ru: 'Он завязывает тебе глаза — обострённые ощущения',
        en: 'He blindfolds you — heightened sensations'
      },
      generation_prompt: 'intimate couple, man putting silk blindfold on woman, sensual atmosphere, soft lighting, bedroom setting',
      is_active: true,
      priority: 50,
    },
    // Pair 2: F blindfolds M (he's blindfolded)
    {
      slug: 'blindfold-give-hetero-f',
      category,
      tags,
      role_direction: 'f_to_m',
      user_description: {
        ru: 'Завязать ему глаза — он полностью в твоей власти',
        en: 'Blindfold him — he\'s completely at your mercy'
      },
      generation_prompt: 'intimate couple, woman putting silk blindfold on man, sensual atmosphere, soft lighting, bedroom setting',
      is_active: true,
      priority: 50,
    },
    {
      slug: 'blindfold-receive-hetero-m',
      category,
      tags,
      role_direction: 'f_to_m',
      user_description: {
        ru: 'Она завязывает тебе глаза — обострённые ощущения',
        en: 'She blindfolds you — heightened sensations'
      },
      generation_prompt: 'intimate couple, woman putting silk blindfold on man, sensual atmosphere, soft lighting, bedroom setting',
      is_active: true,
      priority: 50,
    },
  ];

  console.log('\nCreating scenes with correct pattern...');

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

  // Set up paired_with per docs pattern
  console.log('\nSetting up paired_with...');

  // Pair 1: give-hetero-m ↔ receive-hetero-f
  await supabase
    .from('scenes')
    .update({ paired_with: createdIds['blindfold-give-hetero-m'] })
    .eq('slug', 'blindfold-receive-hetero-f');

  // Pair 2: give-hetero-f ↔ receive-hetero-m
  await supabase
    .from('scenes')
    .update({ paired_with: createdIds['blindfold-give-hetero-f'] })
    .eq('slug', 'blindfold-receive-hetero-m');

  console.log('Paired: blindfold-give-hetero-m ↔ blindfold-receive-hetero-f');
  console.log('Paired: blindfold-give-hetero-f ↔ blindfold-receive-hetero-m');

  // Verify
  console.log('\n--- Verification ---');
  const { data: check } = await supabase
    .from('scenes')
    .select('slug, role_direction, paired_with')
    .ilike('slug', 'blindfold-%')
    .order('slug');

  for (const s of check || []) {
    const pairedSlug = s.paired_with ? (await supabase.from('scenes').select('slug').eq('id', s.paired_with).single()).data?.slug : null;
    console.log(`${s.slug} (${s.role_direction})`);
    console.log(`  paired_with: ${pairedSlug || 'none (primary)'}`);
  }
}

run();
