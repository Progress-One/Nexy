import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const orgasmControlElements = [
  {
    id: 'control_type',
    label: { ru: 'Тип контроля', en: 'Control type' },
    tag_ref: 'orgasm_control_type',
    follow_ups: [
      {
        id: 'control_type_select',
        type: 'multi_select',
        question: { ru: 'Какой контроль нравится?', en: 'What type of control do you enjoy?' },
        config: {
          options: [
            { id: 'edging', label: { ru: 'Эджинг', en: 'Edging' }, description: { ru: 'Довести до грани, но не дать кончить', en: 'Bring to the edge but deny release' } },
            { id: 'forced', label: { ru: 'Принудительный оргазм', en: 'Forced orgasm' }, description: { ru: 'Заставить кончить снова и снова', en: 'Make them cum again and again' } },
            { id: 'ruined', label: { ru: 'Испорченный оргазм', en: 'Ruined orgasm' }, description: { ru: 'Прервать стимуляцию в момент оргазма', en: 'Stop stimulation at the moment of orgasm' } },
          ],
        },
      },
    ],
  },
];

const tags = ['orgasm_control', 'edging', 'denial', 'control', 'teasing'];

const ai_context = {
  tests_primary: ['orgasm_control', 'edging', 'denial'],
  tests_secondary: ['teasing', 'control', 'power']
};

async function run() {
  console.log('Creating orgasm control scenes...\n');

  // Scene: M controls F
  const mToF = {
    slug: 'orgasm-control-m-to-f',
    title: { ru: 'Контроль оргазма', en: 'Orgasm Control' },
    subtitle: { ru: 'Он контролирует её удовольствие', en: 'He controls her pleasure' },
    user_description: { ru: 'Он держит тебя на грани, решая когда и как ты кончишь', en: 'He keeps you on the edge, deciding when and how you come' },
    category: 'control',
    tags,
    intensity: 4,
    ai_context,
    role_direction: 'm_to_f',
    is_active: true,
    elements: orgasmControlElements,
  };

  // Scene: F controls M
  const fToM = {
    slug: 'orgasm-control-f-to-m',
    title: { ru: 'Контроль оргазма', en: 'Orgasm Control' },
    subtitle: { ru: 'Она контролирует его удовольствие', en: 'She controls his pleasure' },
    user_description: { ru: 'Она держит тебя на грани, решая когда и как ты кончишь', en: 'She keeps you on the edge, deciding when and how you come' },
    category: 'control',
    tags,
    intensity: 4,
    ai_context,
    role_direction: 'f_to_m',
    is_active: true,
    elements: orgasmControlElements,
  };

  // Insert M to F
  const { data: d1, error: e1 } = await supabase
    .from('scenes')
    .upsert(mToF, { onConflict: 'slug' })
    .select('slug');

  if (e1) {
    console.log('Error creating m-to-f:', e1.message);
  } else {
    console.log('✅ Created:', d1?.[0]?.slug);
  }

  // Insert F to M
  const { data: d2, error: e2 } = await supabase
    .from('scenes')
    .upsert(fToM, { onConflict: 'slug' })
    .select('slug');

  if (e2) {
    console.log('Error creating f-to-m:', e2.message);
  } else {
    console.log('✅ Created:', d2?.[0]?.slug);
  }

  // Link them as paired
  const { error: e3 } = await supabase
    .from('scenes')
    .update({ paired_with: d2?.[0]?.slug ? (await supabase.from('scenes').select('id').eq('slug', 'orgasm-control-f-to-m').single()).data?.id : null })
    .eq('slug', 'orgasm-control-m-to-f');

  const { error: e4 } = await supabase
    .from('scenes')
    .update({ paired_with: d1?.[0]?.slug ? (await supabase.from('scenes').select('id').eq('slug', 'orgasm-control-m-to-f').single()).data?.id : null })
    .eq('slug', 'orgasm-control-f-to-m');

  if (!e3 && !e4) {
    console.log('✅ Linked as paired scenes');
  }

  console.log('\nDone!');
}

run();
