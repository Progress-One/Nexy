import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Исправления на основе анализа описаний
const fixes: Array<{ slug: string; role_direction: string }> = [
  // body-worship
  { slug: 'body-worship-he-worships-her-receive', role_direction: 'f_to_m' },
  { slug: 'body-worship-she-worships-him-receive', role_direction: 'm_to_f' },

  // bondage
  { slug: 'bondage-he-ties-her-receive', role_direction: 'f_to_m' },
  { slug: 'bondage-she-ties-him-receive', role_direction: 'm_to_f' },

  // butt-plug (особый случай - обе перспективы для мужчины)
  { slug: 'butt-plug-he-wears-give', role_direction: 'm_to_f' },
  { slug: 'butt-plug-he-wears-receive', role_direction: 'm_to_f' },

  // cnc
  { slug: 'cnc-he-takes-her-receive', role_direction: 'f_to_m' },
  { slug: 'cnc-she-takes-him-receive', role_direction: 'm_to_f' },

  // cock-ring
  { slug: 'cock-ring-receive', role_direction: 'm_to_f' },

  // collar
  { slug: 'collar-he-owns-her-receive', role_direction: 'f_to_m' },
  { slug: 'collar-she-owns-him-receive', role_direction: 'm_to_f' },

  // degradation
  { slug: 'degradation-he-degrades-her-receive', role_direction: 'f_to_m' },
  { slug: 'degradation-she-degrades-him-receive', role_direction: 'm_to_f' },

  // edging
  { slug: 'edging-he-controls-her-receive', role_direction: 'f_to_m' },
  { slug: 'edging-she-controls-him-receive', role_direction: 'm_to_f' },

  // face-slapping
  { slug: 'face-slapping-he-slaps-her-receive', role_direction: 'f_to_m' },
  { slug: 'face-slapping-she-slaps-him-receive', role_direction: 'm_to_f' },

  // facesitting
  { slug: 'facesitting-he-on-her-receive', role_direction: 'f_to_m' },

  // female clothing
  { slug: 'female-harness-receive', role_direction: 'f_to_m' },
  { slug: 'female-striptease-receive', role_direction: 'm_to_f' },

  // finger-sucking
  { slug: 'finger-sucking-he-sucks-hers-give', role_direction: 'f_to_m' },
  { slug: 'finger-sucking-she-sucks-his-give', role_direction: 'm_to_f' },

  // foot-worship
  { slug: 'foot-worship-she-worships-his-receive', role_direction: 'm_to_f' },

  // forced-orgasm
  { slug: 'forced-orgasm-on-her-receive', role_direction: 'f_to_m' },
  { slug: 'forced-orgasm-on-him-receive', role_direction: 'm_to_f' },

  // free-use
  { slug: 'free-use-f-available-receive', role_direction: 'f_to_m' },
  { slug: 'free-use-m-available-receive', role_direction: 'm_to_f' },

  // golden-shower
  { slug: 'golden-shower-he-on-her-receive', role_direction: 'f_to_m' },
  { slug: 'golden-shower-she-on-him-receive', role_direction: 'm_to_f' },

  // lactation
  { slug: 'lactation-receive', role_direction: 'm_to_f' },

  // male clothing
  { slug: 'male-harness-receive', role_direction: 'm_to_f' },
  { slug: 'male-lingerie-receive', role_direction: 'm_to_f' },
  { slug: 'male-striptease-receive', role_direction: 'f_to_m' },
  { slug: 'male-uniforms-receive', role_direction: 'm_to_f' },

  // mummification
  { slug: 'mummification-f-receive', role_direction: 'f_to_m' },
  { slug: 'mummification-m-receive', role_direction: 'm_to_f' },

  // objectification
  { slug: 'objectification-f-receive', role_direction: 'f_to_m' },
  { slug: 'objectification-m-receive', role_direction: 'm_to_f' },

  // praise
  { slug: 'praise-he-praises-her-receive', role_direction: 'f_to_m' },
  { slug: 'praise-she-praises-him-receive', role_direction: 'm_to_f' },

  // spanking
  { slug: 'spanking-he-spanks-her-receive', role_direction: 'f_to_m' },
  { slug: 'spanking-she-spanks-him-receive', role_direction: 'm_to_f' },

  // spitting
  { slug: 'spitting-he-on-her-receive', role_direction: 'f_to_m' },
  { slug: 'spitting-she-on-him-receive', role_direction: 'm_to_f' },

  // squirt
  { slug: 'squirt-receiving-receive', role_direction: 'm_to_f' },
];

async function run() {
  console.log('Исправление role_direction для 45 сцен...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const fix of fixes) {
    const { error } = await supabase
      .from('scenes')
      .update({ role_direction: fix.role_direction })
      .eq('slug', fix.slug);

    if (error) {
      console.log(`❌ ${fix.slug}: ${error.message}`);
      errorCount++;
    } else {
      console.log(`✓ ${fix.slug} → ${fix.role_direction}`);
      successCount++;
    }
  }

  console.log(`\n✅ Успешно: ${successCount}`);
  if (errorCount > 0) {
    console.log(`❌ Ошибки: ${errorCount}`);
  }
}

run();
