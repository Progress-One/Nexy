import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const quickieElements = [
  {
    id: 'context',
    label: { ru: 'Контекст', en: 'Context' },
    tag_ref: 'quickie_context',
    follow_ups: [
      {
        id: 'context_select',
        type: 'multi_select',
        question: { ru: 'Какие ситуации нравятся?', en: 'What situations do you enjoy?' },
        config: {
          options: [
            { id: 'spontaneous', label: { ru: 'Спонтанный секс', en: 'Spontaneous sex' }, description: { ru: 'Внезапно захотелось прямо сейчас', en: 'Sudden urge right now' } },
            { id: 'morning', label: { ru: 'Утренние ласки', en: 'Morning teasing' }, description: { ru: 'Нежное пробуждение прикосновениями', en: 'Gentle wake-up with touches' } },
            { id: 'kitchen', label: { ru: 'На кухне', en: 'Kitchen counter' }, description: { ru: 'Страсть посреди бытовых дел', en: 'Passion in the middle of daily routine' } },
            { id: 'casual', label: { ru: 'Случайные прикосновения', en: 'Casual touches' }, description: { ru: 'Лёгкие интимные касания в течение дня', en: 'Light intimate touches throughout the day' } },
          ],
        },
      },
    ],
  },
];

async function run() {
  console.log('Updating quickie scene with spontaneous elements...\n');

  const { data, error } = await supabase
    .from('scenes')
    .update({ elements: quickieElements })
    .eq('slug', 'quickie')
    .select('slug, elements');

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('✅ Updated quickie scene');
    console.log('Elements:', JSON.stringify(data?.[0]?.elements, null, 2));
  }
}

run();
