import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  console.log('Добавление subtitle для оставшихся сцен...\n');

  const fixes = [
    {
      slug: 'cunnilingus-give',
      subtitle: { ru: 'Доставить удовольствие языком', en: 'Give pleasure with your tongue' }
    },
    {
      slug: 'cunnilingus-receive',
      subtitle: { ru: 'Получить удовольствие от его языка', en: 'Receive pleasure from his tongue' }
    },
    {
      slug: 'blowjob-give',
      subtitle: { ru: 'Доставить удовольствие ртом', en: 'Give oral pleasure' }
    },
    {
      slug: 'blowjob-receive',
      subtitle: { ru: 'Получить удовольствие от её рта', en: 'Receive oral pleasure' }
    },
    {
      slug: 'deepthroat-give',
      subtitle: { ru: 'Глубоко в горло', en: 'Take it deep' }
    },
    {
      slug: 'deepthroat-receive',
      subtitle: { ru: 'Глубоко в её горло', en: 'Deep in her throat' }
    },
    {
      slug: 'sex-positions',
      subtitle: { ru: 'Разнообразие поз', en: 'Variety of positions' }
    },
    {
      slug: 'sex-locations',
      subtitle: { ru: 'Разнообразие мест', en: 'Variety of locations' }
    },
  ];

  for (const fix of fixes) {
    const { error } = await supabase
      .from('scenes')
      .update({ subtitle: fix.subtitle })
      .eq('slug', fix.slug);

    if (error) {
      console.log(`  ✗ ${fix.slug}: ${error.message}`);
    } else {
      console.log(`  ✓ ${fix.slug}`);
    }
  }

  // Финальная проверка
  console.log('\n=== ФИНАЛЬНАЯ ПРОВЕРКА ===\n');

  const { data: noTags } = await supabase
    .from('scenes')
    .select('slug')
    .eq('is_active', true)
    .or('tags.is.null,tags.eq.{}');

  const { data: noTitle } = await supabase
    .from('scenes')
    .select('slug')
    .eq('is_active', true)
    .is('title', null);

  const { data: noSubtitle } = await supabase
    .from('scenes')
    .select('slug')
    .eq('is_active', true)
    .is('subtitle', null);

  console.log(`Без тегов: ${noTags?.length || 0}`);
  console.log(`Без title: ${noTitle?.length || 0}`);
  console.log(`Без subtitle: ${noSubtitle?.length || 0}`);

  if ((noTags?.length || 0) + (noTitle?.length || 0) + (noSubtitle?.length || 0) === 0) {
    console.log('\n✓ ВСЕ 296 СЦЕН ИМЕЮТ ВСЕ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ!');
  } else {
    if (noSubtitle && noSubtitle.length > 0) {
      console.log('\nВсё ещё без subtitle:');
      noSubtitle.forEach(s => console.log(`  - ${s.slug}`));
    }
  }

  console.log('\nГотово!');
}

run();
