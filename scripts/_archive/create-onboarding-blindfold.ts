import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Delete old incorrect scenes
  console.log('Deleting old incorrect blindfold scenes...');
  const { error: deleteError } = await supabase
    .from('scenes')
    .delete()
    .ilike('slug', 'blindfold-%');

  if (deleteError) {
    console.error('Error deleting:', deleteError.message);
  }

  // Create onboarding blindfold scenes with correct pattern
  const category = 'onboarding';
  const tags = ['blindfold', 'sensory_deprivation', 'trust', 'surprise'];

  const newScenes = [
    // M→F pair (he blindfolds her)
    {
      slug: 'onboarding-blindfold-give-hetero-m',
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
      slug: 'onboarding-blindfold-receive-hetero-f',
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
    // F→M pair (she blindfolds him)
    {
      slug: 'onboarding-blindfold-give-hetero-f',
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
      slug: 'onboarding-blindfold-receive-hetero-m',
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

  console.log('\nCreating onboarding-blindfold scenes...');

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

  // Set up bidirectional paired_with (same as other give/receive pairs)
  console.log('\nSetting up bidirectional paired_with...');

  const giveM = createdIds['onboarding-blindfold-give-hetero-m'];
  const receiveF = createdIds['onboarding-blindfold-receive-hetero-f'];
  const giveF = createdIds['onboarding-blindfold-give-hetero-f'];
  const receiveM = createdIds['onboarding-blindfold-receive-hetero-m'];

  // M→F pair: give-m ↔ receive-f (bidirectional)
  await supabase.from('scenes').update({ paired_with: receiveF }).eq('id', giveM);
  await supabase.from('scenes').update({ paired_with: giveM }).eq('id', receiveF);
  console.log('Paired: give-hetero-m ↔ receive-hetero-f');

  // F→M pair: give-f ↔ receive-m (bidirectional)
  await supabase.from('scenes').update({ paired_with: receiveM }).eq('id', giveF);
  await supabase.from('scenes').update({ paired_with: giveF }).eq('id', receiveM);
  console.log('Paired: give-hetero-f ↔ receive-hetero-m');

  // Verify
  console.log('\n--- Verification ---');
  const { data: check } = await supabase
    .from('scenes')
    .select('slug, paired_with')
    .ilike('slug', 'onboarding-blindfold-%')
    .order('slug');

  for (const s of check || []) {
    const paired = check?.find(c => c.paired_with === s.paired_with && c.slug !== s.slug);
    const pairedSlug = s.paired_with
      ? (await supabase.from('scenes').select('slug').eq('id', s.paired_with).single()).data?.slug
      : null;
    console.log(`${s.slug.replace('onboarding-blindfold-', '')} ↔ ${pairedSlug?.replace('onboarding-blindfold-', '') || 'none'}`);
  }
}

run();
