import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const category = 'oral';
  const tags = ['oral', 'finger_sucking', 'licking', 'sensual', 'teasing'];

  const ai_context = {
    tests_primary: ['oral', 'finger_sucking', 'sensual'],
    tests_secondary: ['teasing', 'intimacy', 'foreplay']
  };

  const newScenes = [
    // Он сосёт её пальцы (m_to_f action)
    {
      slug: 'finger-sucking-he-sucks-hers-give',
      category,
      tags,
      role_direction: 'm_to_f',
      title: { ru: 'Сосать пальцы', en: 'Finger Sucking' },
      subtitle: { ru: 'Он сосёт её', en: 'He sucks hers' },
      intensity: 1,
      ai_context,
      user_description: {
        ru: 'Ты протягиваешь ему пальцы — он нежно берёт их в рот, облизывает, посасывает',
        en: 'You offer him your fingers — he gently takes them in his mouth, licks, sucks them'
      },
      generation_prompt: 'intimate couple, man gently kissing woman fingers, sensual tender moment, soft lighting',
      is_active: true,
      priority: 50,
    },
    {
      slug: 'finger-sucking-he-sucks-hers-receive',
      category,
      tags,
      role_direction: 'm_to_f',
      title: { ru: 'Сосать пальцы', en: 'Finger Sucking' },
      subtitle: { ru: 'Он сосёт её', en: 'He sucks hers' },
      intensity: 1,
      ai_context,
      user_description: {
        ru: 'Она протягивает тебе пальцы — ты нежно берёшь их в рот, облизываешь, посасываешь',
        en: 'She offers you her fingers — you gently take them in your mouth, lick, suck them'
      },
      generation_prompt: 'intimate couple, man gently kissing woman fingers, sensual tender moment, soft lighting',
      is_active: true,
      priority: 50,
    },
    // Она сосёт его пальцы (f_to_m action)
    {
      slug: 'finger-sucking-she-sucks-his-give',
      category,
      tags,
      role_direction: 'f_to_m',
      title: { ru: 'Сосать пальцы', en: 'Finger Sucking' },
      subtitle: { ru: 'Она сосёт его', en: 'She sucks his' },
      intensity: 1,
      ai_context,
      user_description: {
        ru: 'Ты протягиваешь ей пальцы — она нежно берёт их в рот, облизывает, посасывает',
        en: 'You offer her your fingers — she gently takes them in her mouth, licks, sucks them'
      },
      generation_prompt: 'intimate couple, woman gently kissing man fingers, sensual tender moment, soft lighting',
      is_active: true,
      priority: 50,
    },
    {
      slug: 'finger-sucking-she-sucks-his-receive',
      category,
      tags,
      role_direction: 'f_to_m',
      title: { ru: 'Сосать пальцы', en: 'Finger Sucking' },
      subtitle: { ru: 'Она сосёт его', en: 'She sucks his' },
      intensity: 1,
      ai_context,
      user_description: {
        ru: 'Он протягивает тебе пальцы — ты нежно берёшь их в рот, облизываешь, посасываешь',
        en: 'He offers you his fingers — you gently take them in your mouth, lick, suck them'
      },
      generation_prompt: 'intimate couple, woman gently kissing man fingers, sensual tender moment, soft lighting',
      is_active: true,
      priority: 50,
    },
  ];

  console.log('Создание сцен finger-sucking (4 шт)...\n');

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

  // Set up bidirectional paired_with for both pairs
  console.log('\nНастройка paired_with...');

  // Пара 1: he sucks hers
  const heSucksGive = createdIds['finger-sucking-he-sucks-hers-give'];
  const heSucksReceive = createdIds['finger-sucking-he-sucks-hers-receive'];
  await supabase.from('scenes').update({ paired_with: heSucksReceive }).eq('id', heSucksGive);
  await supabase.from('scenes').update({ paired_with: heSucksGive }).eq('id', heSucksReceive);
  console.log('Paired: finger-sucking-he-sucks-hers-give ↔ finger-sucking-he-sucks-hers-receive');

  // Пара 2: she sucks his
  const sheSucksGive = createdIds['finger-sucking-she-sucks-his-give'];
  const sheSucksReceive = createdIds['finger-sucking-she-sucks-his-receive'];
  await supabase.from('scenes').update({ paired_with: sheSucksReceive }).eq('id', sheSucksGive);
  await supabase.from('scenes').update({ paired_with: sheSucksGive }).eq('id', sheSucksReceive);
  console.log('Paired: finger-sucking-she-sucks-his-give ↔ finger-sucking-she-sucks-his-receive');

  console.log('\nГотово!');
}

run();
