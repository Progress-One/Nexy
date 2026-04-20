import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/**
 * Scene consolidation script:
 * 1. ORGASM CONTROL: Merge 6 scenes → 2 scenes with follow-up
 * 2. POWER-DYNAMIC: Deactivate (covered by onboarding)
 * 3. SPONTANEOUS/INTIMACY: Merge 4 → 1 scene
 */

async function run() {
  console.log('=== Scene Consolidation ===\n');

  // 1. Deactivate old orgasm control scenes
  console.log('1. ORGASM CONTROL - деактивирую старые сцены...');
  const orgasmScenes = [
    'edging-m-to-f',
    'edging-f-to-m',
    'forced-orgasm-m-to-f',
    'forced-orgasm-f-to-m',
    'ruined-orgasm-m-to-f',
    'ruined-orgasm-f-to-m',
  ];

  const { data: deactivatedOrgasm, error: e1 } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .in('slug', orgasmScenes)
    .select('slug');

  if (e1) {
    console.log('  Error:', e1.message);
  } else {
    console.log(`  Деактивировано: ${deactivatedOrgasm?.length || 0} сцен`);
    deactivatedOrgasm?.forEach(s => console.log(`    ❌ ${s.slug}`));
  }

  // 2. Deactivate power-dynamic scene
  console.log('\n2. POWER-DYNAMIC - деактивирую сцену...');
  const { data: deactivatedPower, error: e2 } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .eq('slug', 'power-dynamic')
    .select('slug');

  if (e2) {
    console.log('  Error:', e2.message);
  } else if (deactivatedPower?.length) {
    console.log(`  ❌ power-dynamic деактивирована`);
  } else {
    console.log('  Сцена не найдена или уже неактивна');
  }

  // 3. Deactivate old spontaneous/intimacy scenes (except quickie which we'll update)
  console.log('\n3. SPONTANEOUS/INTIMACY - деактивирую старые сцены...');
  const spontaneousScenes = [
    'kitchen-counter',
    'morning-teasing',
    'casual-intimate-touch',
    'casual-touch',
  ];

  const { data: deactivatedSpontaneous, error: e3 } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .in('slug', spontaneousScenes)
    .select('slug');

  if (e3) {
    console.log('  Error:', e3.message);
  } else {
    console.log(`  Деактивировано: ${deactivatedSpontaneous?.length || 0} сцен`);
    deactivatedSpontaneous?.forEach(s => console.log(`    ❌ ${s.slug}`));
  }

  // 4. Check quickie scene exists (will be used as base for merged spontaneous)
  console.log('\n4. Проверяю quickie сцену...');
  const { data: quickie } = await supabase
    .from('scenes')
    .select('slug, title, is_active')
    .eq('slug', 'quickie')
    .single();

  if (quickie) {
    console.log(`  ✅ quickie найдена, is_active: ${quickie.is_active}`);
  } else {
    console.log('  ⚠️ quickie не найдена');
  }

  console.log('\n=== Готово ===');
  console.log('\nСледующие шаги:');
  console.log('1. Создать сцены orgasm-control-m-to-f и orgasm-control-f-to-m');
  console.log('2. Добавить follow-up с типами контроля (edging/forced/ruined)');
  console.log('3. Обновить onboarding-gates.ts - удалить старые сцены, добавить новые');
  console.log('4. Обновить quickie сцену с элементами для spontaneous вариантов');
}

run();
