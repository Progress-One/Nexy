import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Определяем пол по описанию:
// "Ты ... ей/её/ему/его" - от чьего лица написано
// "ей/её" = написано для мужчины (он обращается к НЕЙ)
// "ему/его" = написано для женщины (она обращается к НЕМУ)

function detectPerspective(desc: string): 'male' | 'female' | 'unknown' {
  if (!desc) return 'unknown';

  // Паттерны для мужской перспективы (обращение к женщине)
  const malePatterns = [
    /ты\s+.*\s+(ей|её|неё)/i,
    /она\s+.*\s+(тебе|тебя)/i,
    /she\s+/i,
    /her\s+/i,
    /\bей\b/i,
    /\bеё\b/i,
  ];

  // Паттерны для женской перспективы (обращение к мужчине)
  const femalePatterns = [
    /ты\s+.*\s+(ему|его|нему)/i,
    /он\s+.*\s+(тебе|тебя)/i,
    /\bhe\s+/i,
    /\bhis\b/i,
    /\bhim\b/i,
    /\bему\b/i,
    /\bего\b/i,
  ];

  const text = desc.toLowerCase();

  let maleScore = 0;
  let femaleScore = 0;

  for (const p of malePatterns) {
    if (p.test(text)) maleScore++;
  }
  for (const p of femalePatterns) {
    if (p.test(text)) femaleScore++;
  }

  if (maleScore > femaleScore) return 'male';
  if (femaleScore > maleScore) return 'female';
  return 'unknown';
}

async function run() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, role_direction, user_description, is_active')
    .or('slug.ilike.%-give,slug.ilike.%-receive')
    .eq('is_active', true)
    .order('slug');

  console.log('Аудит role_direction для give/receive сцен\n');
  console.log('Правило: role_direction должен соответствовать перспективе описания');
  console.log('  m_to_f = показывается мужчине');
  console.log('  f_to_m = показывается женщине\n');
  console.log('='.repeat(80));

  const fixes: Array<{slug: string, current: string, should_be: string, desc_ru: string}> = [];

  for (const s of scenes || []) {
    const descRu = s.user_description?.ru || '';
    const descEn = s.user_description?.en || '';
    const perspective = detectPerspective(descRu) || detectPerspective(descEn);

    // Определяем ожидаемый role_direction
    let expected: string | null = null;
    if (perspective === 'male') expected = 'm_to_f';
    if (perspective === 'female') expected = 'f_to_m';

    const current = s.role_direction;
    const isWrong = expected && current !== expected;

    if (isWrong) {
      fixes.push({
        slug: s.slug,
        current: current,
        should_be: expected!,
        desc_ru: descRu.substring(0, 60)
      });
      console.log(`❌ ${s.slug}`);
      console.log(`   Текущий: ${current}, Должен: ${expected}`);
      console.log(`   Описание: "${descRu.substring(0, 60)}..."`);
      console.log('');
    }
  }

  console.log('='.repeat(80));
  console.log(`\nИтого требуют исправления: ${fixes.length} сцен\n`);

  if (fixes.length > 0) {
    console.log('Сцены для исправления:');
    for (const f of fixes) {
      console.log(`  ${f.slug}: ${f.current} → ${f.should_be}`);
    }
  }
}

run();
