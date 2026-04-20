import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, role_direction, user_description')
    .ilike('slug', 'foot-worship%')
    .eq('is_active', true)
    .order('slug');

  console.log('=== FOOT WORSHIP SCENES ===\n');

  for (const s of data || []) {
    const dir = s.role_direction === 'm_to_f' ? 'МУЖЧИНЕ' : 'ЖЕНЩИНЕ';
    console.log('---');
    console.log('SLUG:', s.slug);
    console.log('Показывается:', dir);
    console.log('RU:', s.user_description?.ru);
  }

  console.log('\n=== ЧТО УЗНАЁМ ===\n');
  console.log('Для МУЖЧИНЫ (он отвечает на 2 вопроса):');
  console.log('1. foot-worship-he-worships-her-give → "Ты лижешь ЕЁ ступни" → Нравится ЛИЗАТЬ?');
  console.log('2. foot-worship-she-worships-his-receive → "Она лижет ТВОИ ступни" → Нравится когда ЛИЖУТ тебя?');

  console.log('\nДля ЖЕНЩИНЫ (она отвечает на 2 вопроса):');
  console.log('1. foot-worship-she-worships-his-give → "Ты лижешь ЕГО ступни" → Нравится ЛИЗАТЬ?');
  console.log('2. foot-worship-he-worships-her-receive → "Он лижет ТВОИ ступни" → Нравится когда ЛИЖУТ тебя?');
}
run();
