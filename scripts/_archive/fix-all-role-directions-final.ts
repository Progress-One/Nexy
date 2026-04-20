import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Ручной анализ всех 174 сцен - найдено 40 с неправильным role_direction
// Правило: give/receive пары должны иметь РАЗНЫЕ role_direction
//
// "Ты... ей/её/неё" = описание для мужчины = m_to_f
// "Ты... ему/его/нему" = описание для женщины = f_to_m
// "Он... тебе/твой" = описание для женщины = f_to_m
// "Она... тебе/твой" = описание для мужчины = m_to_f

const fixes: Array<{ slug: string; from: string; to: string; reason: string }> = [
  // anal-play: receive должен быть противоположным give
  { slug: 'anal-play-on-her-receive', from: 'm_to_f', to: 'f_to_m', reason: '"Он ласкает твою попку" = для женщины' },
  { slug: 'anal-play-on-him-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она ласкает твой анус" = для мужчины' },

  // blowjob: receive должен быть для мужчины
  { slug: 'blowjob-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она на коленях перед тобой" = для мужчины' },

  // boss scenarios: receive должен быть противоположным
  { slug: 'boss-f-subordinate-m-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она босс. Ты её подчинённый" = для мужчины' },
  { slug: 'boss-m-secretary-f-receive', from: 'm_to_f', to: 'f_to_m', reason: '"Он босс. Ты его секретарша" = для женщины' },

  // breath-play: receive противоположный give
  { slug: 'breath-play-f-to-m-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она контролирует твоё дыхание" = для мужчины' },
  { slug: 'breath-play-m-to-f-receive', from: 'm_to_f', to: 'f_to_m', reason: '"Он контролирует твоё дыхание" = для женщины' },

  // cbt: receive для мужчины
  { slug: 'cbt-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она причиняет боль твоим гениталиям" = для мужчины' },

  // cock-worship: receive для мужчины
  { slug: 'cock-worship-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она поклоняется твоему члену" = для мужчины' },

  // cunnilingus: receive для женщины
  { slug: 'cunnilingus-receive', from: 'm_to_f', to: 'f_to_m', reason: '"Он между твоих ног, лижет твою киску" = для женщины' },

  // deepthroat: receive для мужчины
  { slug: 'deepthroat-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она берёт твой член глубоко в горло" = для мужчины' },

  // female-lingerie/uniforms: receive для женщины
  { slug: 'female-lingerie-receive', from: 'm_to_f', to: 'f_to_m', reason: '"Ты в кружевном белье для него" = для женщины' },
  { slug: 'female-uniforms-receive', from: 'm_to_f', to: 'f_to_m', reason: '"Ты в костюме для него" = для женщины' },

  // fingering: receive для женщины
  { slug: 'fingering-receive', from: 'm_to_f', to: 'f_to_m', reason: '"Он ласкает твой клитор" = для женщины' },

  // fisting: receive противоположный
  { slug: 'fisting-f-to-m-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она вводит кулак в твой анус" = для мужчины' },
  { slug: 'fisting-m-to-f-receive', from: 'm_to_f', to: 'f_to_m', reason: '"Он вводит сначала один палец" = для женщины' },

  // foot-worship: receive противоположный
  { slug: 'foot-worship-he-worships-her-receive', from: 'm_to_f', to: 'f_to_m', reason: '"Он целует твои ступни" = для женщины' },

  // glory-hole: receive для мужчины
  { slug: 'glory-hole-blowjob-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Анонимный рот сосёт твой член" = для мужчины' },

  // handjob: receive для мужчины
  { slug: 'handjob-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она обхватывает твой член рукой" = для мужчины' },

  // knife-play: receive противоположный
  { slug: 'knife-play-f-to-m-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она водит ножом по твоему телу" = для мужчины' },
  { slug: 'knife-play-m-to-f-receive', from: 'm_to_f', to: 'f_to_m', reason: '"Он водит ножом по твоему телу" = для женщины' },

  // massage: receive противоположный
  { slug: 'massage-he-massages-her-receive', from: 'm_to_f', to: 'f_to_m', reason: '"Он массирует твоё тело" = для женщины' },
  { slug: 'massage-she-massages-him-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она массирует твоё тело" = для мужчины' },

  // masturbation: GIVE неправильный (кто смотрит)
  { slug: 'masturbation-he-for-her-give', from: 'm_to_f', to: 'f_to_m', reason: '"Он мастурбирует перед тобой" = для женщины (она смотрит)' },
  { slug: 'masturbation-she-for-him-give', from: 'f_to_m', to: 'm_to_f', reason: '"Она мастурбирует перед тобой" = для мужчины (он смотрит)' },

  // nipple-play: receive противоположный
  { slug: 'nipple-play-he-on-her-receive', from: 'm_to_f', to: 'f_to_m', reason: '"Он ласкает твои соски" = для женщины' },
  { slug: 'nipple-play-she-on-him-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она ласкает твои соски" = для мужчины' },

  // pegging: receive для мужчины
  { slug: 'pegging-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она надевает страпон и трахает тебя" = для мужчины' },

  // pussy-worship: receive для женщины
  { slug: 'pussy-worship-receive', from: 'm_to_f', to: 'f_to_m', reason: '"Он поклоняется твоей киске" = для женщины' },

  // rimming: receive противоположный
  { slug: 'rimming-he-to-her-receive', from: 'm_to_f', to: 'f_to_m', reason: '"Он лижет твой анус" = для женщины' },
  { slug: 'rimming-she-to-him-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она лижет твой анус" = для мужчины' },

  // ruined-orgasm: receive противоположный
  { slug: 'ruined-orgasm-f-to-m-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она прекращает стимуляцию" = для мужчины' },
  { slug: 'ruined-orgasm-m-to-f-receive', from: 'm_to_f', to: 'f_to_m', reason: '"Он прекращает стимуляцию" = для женщины' },

  // somnophilia: receive противоположный
  { slug: 'somnophilia-f-to-m-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она занимается с тобой сексом" = для мужчины' },
  { slug: 'somnophilia-m-to-f-receive', from: 'm_to_f', to: 'f_to_m', reason: '"Он занимается с тобой сексом" = для женщины' },

  // squirting-on-self: receive для мужчины (он смотрит)
  { slug: 'squirting-on-self-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она сквиртует... Ты смотришь" = для мужчины' },

  // teacher: receive противоположный
  { slug: 'teacher-f-student-m-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она учительница. Ты ученик" = для мужчины' },
  { slug: 'teacher-m-student-f-receive', from: 'm_to_f', to: 'f_to_m', reason: '"Он учитель. Ты ученица" = для женщины' },

  // wax-play: receive противоположный
  { slug: 'wax-play-he-on-her-receive', from: 'm_to_f', to: 'f_to_m', reason: '"Он капает воском на твоё тело" = для женщины' },
  { slug: 'wax-play-she-on-him-receive', from: 'f_to_m', to: 'm_to_f', reason: '"Она капает воском на твоё тело" = для мужчины' },
];

async function run() {
  console.log('Исправление role_direction для 40 сцен (ручной анализ)\n');
  console.log('='.repeat(80));

  let successCount = 0;
  let errorCount = 0;

  for (const fix of fixes) {
    const { error } = await supabase
      .from('scenes')
      .update({ role_direction: fix.to })
      .eq('slug', fix.slug);

    if (error) {
      console.log(`\n❌ ${fix.slug}`);
      console.log(`   Ошибка: ${error.message}`);
      errorCount++;
    } else {
      console.log(`\n✓ ${fix.slug}`);
      console.log(`   ${fix.from} → ${fix.to}`);
      console.log(`   Причина: ${fix.reason}`);
      successCount++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n✅ Успешно: ${successCount}`);
  if (errorCount > 0) {
    console.log(`❌ Ошибки: ${errorCount}`);
  }
}

run();
