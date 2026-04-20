import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  console.log('Исправление всех проблем со сценами...\n');

  // 1. orgasm-control - добавить теги
  console.log('1. Добавление тегов для orgasm-control...');
  const orgasmControlTags = ['orgasm_control', 'edging', 'denial', 'control', 'teasing'];

  await supabase
    .from('scenes')
    .update({
      tags: orgasmControlTags,
      title: { ru: 'Контроль оргазма', en: 'Orgasm Control' },
      subtitle: { ru: 'Не дать кончить', en: 'Denial and edging' }
    })
    .eq('slug', 'orgasm-control-f-to-m');
  console.log('  ✓ orgasm-control-f-to-m');

  await supabase
    .from('scenes')
    .update({
      tags: orgasmControlTags,
      title: { ru: 'Контроль оргазма', en: 'Orgasm Control' },
      subtitle: { ru: 'Не дать кончить', en: 'Denial and edging' }
    })
    .eq('slug', 'orgasm-control-m-to-f');
  console.log('  ✓ orgasm-control-m-to-f');

  // 2. onboarding scenes без тегов - нужно добавить теги на основе категории
  console.log('\n2. Добавление тегов для onboarding сцен...');

  const onboardingFixes = [
    { slug: 'onboarding-extreme-give-hetero-f', tags: ['extreme', 'edge_play', 'intense'] },
    { slug: 'onboarding-extreme-receive-hetero-m', tags: ['extreme', 'edge_play', 'intense'] },
    { slug: 'onboarding-lingerie-give-hetero-m-alt', tags: ['lingerie', 'visual', 'seductive'] },
    { slug: 'onboarding-lingerie-receive-hetero-f-alt', tags: ['lingerie', 'visual', 'seductive'] },
    { slug: 'onboarding-romantic-give-hetero-f', tags: ['romantic', 'sensual', 'intimate'] },
    { slug: 'onboarding-romantic-receive-hetero-m', tags: ['romantic', 'sensual', 'intimate'] },
    { slug: 'onboarding-toys-give-hetero-f', tags: ['toys', 'vibrator', 'pleasure'] },
    { slug: 'onboarding-toys-receive-hetero-m', tags: ['toys', 'vibrator', 'pleasure'] },
  ];

  for (const fix of onboardingFixes) {
    await supabase
      .from('scenes')
      .update({ tags: fix.tags })
      .eq('slug', fix.slug);
    console.log(`  ✓ ${fix.slug}`);
  }

  // 3. onboarding-blindfold без title
  console.log('\n3. Добавление title для onboarding-blindfold...');

  const blindfoldTitle = { ru: 'Повязка на глаза', en: 'Blindfold' };
  const blindfoldSubtitle = { ru: 'Обострить чувства', en: 'Heighten your senses' };
  const blindfoldTags = ['blindfold', 'sensory_deprivation', 'trust', 'surprise'];

  const blindfoldScenes = [
    'onboarding-blindfold-give-hetero-f',
    'onboarding-blindfold-give-hetero-m',
    'onboarding-blindfold-receive-hetero-f',
    'onboarding-blindfold-receive-hetero-m',
  ];

  for (const slug of blindfoldScenes) {
    await supabase
      .from('scenes')
      .update({
        title: blindfoldTitle,
        subtitle: blindfoldSubtitle,
        tags: blindfoldTags
      })
      .eq('slug', slug);
    console.log(`  ✓ ${slug}`);
  }

  // 4. Остальные onboarding без subtitle
  console.log('\n4. Добавление subtitle для остальных onboarding...');

  // Получаем все onboarding без subtitle
  const { data: noSubtitle } = await supabase
    .from('scenes')
    .select('slug, category, title')
    .eq('is_active', true)
    .ilike('slug', 'onboarding-%')
    .is('subtitle', null);

  for (const scene of noSubtitle || []) {
    // Генерируем subtitle на основе slug
    let subtitle = { ru: 'Узнай свои желания', en: 'Discover your desires' };

    if (scene.slug.includes('extreme')) {
      subtitle = { ru: 'На грани', en: 'On the edge' };
    } else if (scene.slug.includes('romantic')) {
      subtitle = { ru: 'Нежность и страсть', en: 'Tenderness and passion' };
    } else if (scene.slug.includes('lingerie')) {
      subtitle = { ru: 'Красота и соблазн', en: 'Beauty and seduction' };
    } else if (scene.slug.includes('toys')) {
      subtitle = { ru: 'Игрушки для удовольствия', en: 'Toys for pleasure' };
    }

    await supabase
      .from('scenes')
      .update({ subtitle })
      .eq('slug', scene.slug);
    console.log(`  ✓ ${scene.slug}`);
  }

  // 5. cum-where-to-finish без subtitle
  console.log('\n5. Добавление subtitle для cum-where-to-finish...');
  await supabase
    .from('scenes')
    .update({ subtitle: { ru: 'Куда финишировать', en: 'Where to finish' } })
    .eq('slug', 'cum-where-to-finish');
  console.log('  ✓ cum-where-to-finish');

  // Верификация
  console.log('\n\n=== ВЕРИФИКАЦИЯ ===\n');

  const { data: stillNoTags } = await supabase
    .from('scenes')
    .select('slug')
    .eq('is_active', true)
    .or('tags.is.null,tags.eq.{}');

  const { data: stillNoTitle } = await supabase
    .from('scenes')
    .select('slug')
    .eq('is_active', true)
    .is('title', null);

  const { data: stillNoSubtitle } = await supabase
    .from('scenes')
    .select('slug')
    .eq('is_active', true)
    .is('subtitle', null);

  console.log(`Сцен без тегов: ${stillNoTags?.length || 0}`);
  console.log(`Сцен без title: ${stillNoTitle?.length || 0}`);
  console.log(`Сцен без subtitle: ${stillNoSubtitle?.length || 0}`);

  if (stillNoTags && stillNoTags.length > 0) {
    console.log('\nВсё ещё без тегов:');
    stillNoTags.forEach(s => console.log(`  - ${s.slug}`));
  }

  console.log('\nГотово!');
}

run();
