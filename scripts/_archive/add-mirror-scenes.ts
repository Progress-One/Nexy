import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Step 1: Rename existing simple pairs to give/receive pattern
const RENAMES = [
  // LINGERIE: F shows (give), M watches (receive)
  { from: 'onboarding-lingerie-hetero-f', to: 'onboarding-lingerie-give-hetero-f' },
  { from: 'onboarding-lingerie-hetero-m', to: 'onboarding-lingerie-receive-hetero-m' },

  // EXTREME: M controls F - M=give, F=receive
  { from: 'onboarding-extreme-hetero-m', to: 'onboarding-extreme-give-hetero-m' },
  { from: 'onboarding-extreme-hetero-f', to: 'onboarding-extreme-receive-hetero-f' },

  // ROMANTIC: M undresses F - M=give, F=receive
  { from: 'onboarding-romantic-hetero-m', to: 'onboarding-romantic-give-hetero-m' },
  { from: 'onboarding-romantic-hetero-f', to: 'onboarding-romantic-receive-hetero-f' },

  // TOYS: M uses on F - M=give, F=receive
  { from: 'onboarding-toys-hetero-m', to: 'onboarding-toys-give-hetero-m' },
  { from: 'onboarding-toys-hetero-f', to: 'onboarding-toys-receive-hetero-f' },
];

// Step 2: New F→M mirror scenes to create
const NEW_SCENES = [
  // LINGERIE F→M: M shows (harness), F watches
  {
    slug: 'onboarding-lingerie-give-hetero-m-alt', // M shows to F
    title: { en: 'Lingerie', ru: 'Красивое бельё' },
    user_description: {
      en: "He's in a leather harness. Straps accentuate his body. You admire.",
      ru: 'Он в кожаной сбруе. Ремни подчёркивают его тело. Ты любуешься.'
    },
    role_direction: 'f_to_m',
    paired_slug: 'onboarding-lingerie-receive-hetero-f-alt'
  },
  {
    slug: 'onboarding-lingerie-receive-hetero-f-alt', // F watches M
    title: { en: 'Lingerie', ru: 'Красивое бельё' },
    user_description: {
      en: "You admire him in a leather harness. Straps accentuate his body.",
      ru: 'Ты любуешься им в кожаной сбруе. Ремни подчёркивают его тело.'
    },
    role_direction: 'm_to_f',
    paired_slug: 'onboarding-lingerie-give-hetero-m-alt'
  },

  // EXTREME F→M: F controls M's breathing
  {
    slug: 'onboarding-extreme-give-hetero-f', // F controls M
    title: { en: 'Extreme', ru: 'Экстрим' },
    user_description: {
      en: "You control his breathing, squeezing his throat. Edge play.",
      ru: 'Ты контролируешь его дыхание, сжимая горло. Игры на грани.'
    },
    role_direction: 'f_to_m',
    paired_slug: 'onboarding-extreme-receive-hetero-m'
  },
  {
    slug: 'onboarding-extreme-receive-hetero-m', // M receives from F
    title: { en: 'Extreme', ru: 'Экстрим' },
    user_description: {
      en: "She controls your breathing, squeezing your throat. Edge play.",
      ru: 'Она контролирует твоё дыхание, сжимая горло. Игры на грани.'
    },
    role_direction: 'f_to_m',
    paired_slug: 'onboarding-extreme-give-hetero-f'
  },

  // ROMANTIC F→M: F undresses M
  {
    slug: 'onboarding-romantic-give-hetero-f', // F undresses M
    title: { en: 'Romantic', ru: 'Романтика' },
    user_description: {
      en: "Candles. Long kisses. You slowly undress him, kissing every inch of his skin.",
      ru: 'Свечи. Долгие поцелуи. Ты медленно раздеваешь его, целуя каждый сантиметр кожи.'
    },
    role_direction: 'f_to_m',
    paired_slug: 'onboarding-romantic-receive-hetero-m'
  },
  {
    slug: 'onboarding-romantic-receive-hetero-m', // M receives from F
    title: { en: 'Romantic', ru: 'Романтика' },
    user_description: {
      en: "Candles. Long kisses. She slowly undresses you, kissing every inch of your skin.",
      ru: 'Свечи. Долгие поцелуи. Она медленно раздевает тебя, целуя каждый сантиметр кожи.'
    },
    role_direction: 'f_to_m',
    paired_slug: 'onboarding-romantic-give-hetero-f'
  },

  // TOYS F→M: F uses on M
  {
    slug: 'onboarding-toys-give-hetero-f', // F uses on M
    title: { en: 'Toys', ru: 'Игрушки' },
    user_description: {
      en: "You use sex toys on him.",
      ru: 'Ты используешь на нём секс игрушки.'
    },
    role_direction: 'f_to_m',
    paired_slug: 'onboarding-toys-receive-hetero-m'
  },
  {
    slug: 'onboarding-toys-receive-hetero-m', // M receives from F
    title: { en: 'Toys', ru: 'Игрушки' },
    user_description: {
      en: "She uses sex toys on you.",
      ru: 'Она использует на тебе секс игрушки.'
    },
    role_direction: 'f_to_m',
    paired_slug: 'onboarding-toys-give-hetero-f'
  },
];

async function migrate() {
  console.log('=== STEP 1: Rename existing scenes ===\n');

  for (const { from, to } of RENAMES) {
    const { data, error } = await supabase
      .from('scenes')
      .update({ slug: to })
      .eq('slug', from)
      .select('id, slug');

    if (error) {
      console.log(`❌ ${from} → ${to}: ${error.message}`);
    } else if (data?.length) {
      console.log(`✓ ${from} → ${to}`);
    } else {
      console.log(`⚠ ${from} not found (already renamed?)`);
    }
  }

  console.log('\n=== STEP 2: Update paired_with references ===\n');

  // Update paired_with for renamed scenes
  const PAIR_UPDATES = [
    // Lingerie pair
    { slug: 'onboarding-lingerie-give-hetero-f', paired_slug: 'onboarding-lingerie-receive-hetero-m' },
    { slug: 'onboarding-lingerie-receive-hetero-m', paired_slug: 'onboarding-lingerie-give-hetero-f' },
    // Extreme pair (M→F)
    { slug: 'onboarding-extreme-give-hetero-m', paired_slug: 'onboarding-extreme-receive-hetero-f' },
    { slug: 'onboarding-extreme-receive-hetero-f', paired_slug: 'onboarding-extreme-give-hetero-m' },
    // Romantic pair (M→F)
    { slug: 'onboarding-romantic-give-hetero-m', paired_slug: 'onboarding-romantic-receive-hetero-f' },
    { slug: 'onboarding-romantic-receive-hetero-f', paired_slug: 'onboarding-romantic-give-hetero-m' },
    // Toys pair (M→F)
    { slug: 'onboarding-toys-give-hetero-m', paired_slug: 'onboarding-toys-receive-hetero-f' },
    { slug: 'onboarding-toys-receive-hetero-f', paired_slug: 'onboarding-toys-give-hetero-m' },
  ];

  for (const { slug, paired_slug } of PAIR_UPDATES) {
    // Get the paired scene ID
    const { data: pairedScene } = await supabase
      .from('scenes')
      .select('id')
      .eq('slug', paired_slug)
      .single();

    if (pairedScene) {
      const { error } = await supabase
        .from('scenes')
        .update({ paired_with: pairedScene.id })
        .eq('slug', slug);

      if (error) {
        console.log(`❌ ${slug} → ${paired_slug}: ${error.message}`);
      } else {
        console.log(`✓ ${slug} ↔ ${paired_slug}`);
      }
    } else {
      console.log(`⚠ Paired scene not found: ${paired_slug}`);
    }
  }

  console.log('\n=== STEP 3: Create new F→M mirror scenes ===\n');

  // Get a template scene for defaults
  const { data: template } = await supabase
    .from('scenes')
    .select('*')
    .eq('slug', 'onboarding-extreme-give-hetero-m')
    .single();

  if (!template) {
    console.log('❌ Template scene not found');
    return;
  }

  for (const scene of NEW_SCENES) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('scenes')
      .select('id')
      .eq('slug', scene.slug)
      .single();

    if (existing) {
      console.log(`⚠ ${scene.slug} already exists`);
      continue;
    }

    // Create new scene
    const { data: newScene, error } = await supabase
      .from('scenes')
      .insert({
        slug: scene.slug,
        category: 'onboarding',
        title: scene.title,
        user_description: scene.user_description,
        role_direction: scene.role_direction,
        is_active: true,
        version: 2,
        priority: 50,
        // Copy from template
        generation_prompt: template.generation_prompt,
        image_prompt: template.image_prompt,
      })
      .select('id')
      .single();

    if (error) {
      console.log(`❌ ${scene.slug}: ${error.message}`);
    } else {
      console.log(`✓ Created ${scene.slug}`);
    }
  }

  console.log('\n=== STEP 4: Link new paired scenes ===\n');

  // Link the new F→M pairs
  const NEW_PAIRS = [
    { slug: 'onboarding-extreme-give-hetero-f', paired_slug: 'onboarding-extreme-receive-hetero-m' },
    { slug: 'onboarding-extreme-receive-hetero-m', paired_slug: 'onboarding-extreme-give-hetero-f' },
    { slug: 'onboarding-romantic-give-hetero-f', paired_slug: 'onboarding-romantic-receive-hetero-m' },
    { slug: 'onboarding-romantic-receive-hetero-m', paired_slug: 'onboarding-romantic-give-hetero-f' },
    { slug: 'onboarding-toys-give-hetero-f', paired_slug: 'onboarding-toys-receive-hetero-m' },
    { slug: 'onboarding-toys-receive-hetero-m', paired_slug: 'onboarding-toys-give-hetero-f' },
    // Lingerie alt pair
    { slug: 'onboarding-lingerie-give-hetero-m-alt', paired_slug: 'onboarding-lingerie-receive-hetero-f-alt' },
    { slug: 'onboarding-lingerie-receive-hetero-f-alt', paired_slug: 'onboarding-lingerie-give-hetero-m-alt' },
  ];

  for (const { slug, paired_slug } of NEW_PAIRS) {
    const { data: pairedScene } = await supabase
      .from('scenes')
      .select('id')
      .eq('slug', paired_slug)
      .single();

    if (pairedScene) {
      const { error } = await supabase
        .from('scenes')
        .update({ paired_with: pairedScene.id })
        .eq('slug', slug);

      if (error) {
        console.log(`❌ ${slug} → ${paired_slug}: ${error.message}`);
      } else {
        console.log(`✓ ${slug} ↔ ${paired_slug}`);
      }
    }
  }

  console.log('\n=== DONE ===');
}

migrate().catch(console.error);
