import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('scenes')
    .select('slug, category, tags, title, subtitle, intensity, ai_context, is_active')
    .eq('is_active', true)
    .order('category')
    .order('slug');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Проверка ВСЕХ ${data?.length} активных сцен\n`);

  // Проблемы
  const noTags: string[] = [];
  const emptyTags: string[] = [];
  const noTitle: string[] = [];
  const noSubtitle: string[] = [];
  const noIntensity: string[] = [];
  const noAiContext: string[] = [];

  for (const s of data || []) {
    if (!s.tags || s.tags.length === 0) {
      noTags.push(`${s.slug} (${s.category})`);
    } else if (!s.tags[0]) {
      emptyTags.push(`${s.slug} (${s.category})`);
    }

    if (!s.title || (typeof s.title === 'object' && !s.title.ru && !s.title.en)) {
      noTitle.push(s.slug);
    }

    if (!s.subtitle || (typeof s.subtitle === 'object' && !s.subtitle.ru && !s.subtitle.en)) {
      noSubtitle.push(s.slug);
    }

    if (!s.intensity) {
      noIntensity.push(s.slug);
    }

    if (!s.ai_context || !s.ai_context.tests_primary) {
      noAiContext.push(s.slug);
    }
  }

  // Отчёт
  if (noTags.length > 0) {
    console.log(`\n## БЕЗ ТЕГОВ (${noTags.length}) - КРИТИЧНО!\n`);
    noTags.forEach(s => console.log(`  - ${s}`));
  }

  if (emptyTags.length > 0) {
    console.log(`\n## ПУСТОЙ tags[0] (${emptyTags.length}) - КРИТИЧНО!\n`);
    emptyTags.forEach(s => console.log(`  - ${s}`));
  }

  if (noTitle.length > 0) {
    console.log(`\n## БЕЗ TITLE (${noTitle.length})\n`);
    if (noTitle.length <= 20) {
      noTitle.forEach(s => console.log(`  - ${s}`));
    } else {
      console.log(`  ${noTitle.slice(0, 10).join(', ')}... и ещё ${noTitle.length - 10}`);
    }
  }

  if (noSubtitle.length > 0) {
    console.log(`\n## БЕЗ SUBTITLE (${noSubtitle.length})\n`);
    if (noSubtitle.length <= 20) {
      noSubtitle.forEach(s => console.log(`  - ${s}`));
    } else {
      console.log(`  ${noSubtitle.slice(0, 10).join(', ')}... и ещё ${noSubtitle.length - 10}`);
    }
  }

  if (noIntensity.length > 0) {
    console.log(`\n## БЕЗ INTENSITY (${noIntensity.length})\n`);
    if (noIntensity.length <= 20) {
      noIntensity.forEach(s => console.log(`  - ${s}`));
    } else {
      console.log(`  ${noIntensity.slice(0, 10).join(', ')}... и ещё ${noIntensity.length - 10}`);
    }
  }

  if (noAiContext.length > 0) {
    console.log(`\n## БЕЗ AI_CONTEXT (${noAiContext.length})\n`);
    if (noAiContext.length <= 20) {
      noAiContext.forEach(s => console.log(`  - ${s}`));
    } else {
      console.log(`  ${noAiContext.slice(0, 10).join(', ')}... и ещё ${noAiContext.length - 10}`);
    }
  }

  // Итог
  console.log('\n' + '='.repeat(60));
  console.log('ИТОГ');
  console.log('='.repeat(60));
  console.log(`Всего активных сцен: ${data?.length}`);
  console.log(`Без тегов: ${noTags.length}`);
  console.log(`Пустой tags[0]: ${emptyTags.length}`);
  console.log(`Без title: ${noTitle.length}`);
  console.log(`Без subtitle: ${noSubtitle.length}`);
  console.log(`Без intensity: ${noIntensity.length}`);
  console.log(`Без ai_context: ${noAiContext.length}`);
}

run();
