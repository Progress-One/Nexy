import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  console.log('Fixing remaining onboarding subtitles...\n');

  const fixes = [
    {
      slug: 'onboarding-extreme-give-hetero-f',
      subtitle: { ru: 'На грани', en: 'On the edge' }
    },
    {
      slug: 'onboarding-extreme-receive-hetero-m',
      subtitle: { ru: 'На грани', en: 'On the edge' }
    },
    {
      slug: 'onboarding-lingerie-give-hetero-m-alt',
      subtitle: { ru: 'Красота и соблазн', en: 'Beauty and seduction' }
    },
    {
      slug: 'onboarding-lingerie-receive-hetero-f-alt',
      subtitle: { ru: 'Красота и соблазн', en: 'Beauty and seduction' }
    },
    {
      slug: 'onboarding-romantic-give-hetero-f',
      subtitle: { ru: 'Нежность и страсть', en: 'Tenderness and passion' }
    },
    {
      slug: 'onboarding-romantic-receive-hetero-m',
      subtitle: { ru: 'Нежность и страсть', en: 'Tenderness and passion' }
    },
    {
      slug: 'onboarding-toys-give-hetero-f',
      subtitle: { ru: 'Игрушки для удовольствия', en: 'Toys for pleasure' }
    },
    {
      slug: 'onboarding-toys-receive-hetero-m',
      subtitle: { ru: 'Игрушки для удовольствия', en: 'Toys for pleasure' }
    },
  ];

  for (const fix of fixes) {
    const { error } = await supabase
      .from('scenes')
      .update({ subtitle: fix.subtitle })
      .eq('slug', fix.slug);

    if (error) {
      console.log(`✗ ${fix.slug}: ${error.message}`);
    } else {
      console.log(`✓ ${fix.slug}`);
    }
  }

  // Verify
  const { data: stillMissing } = await supabase
    .from('scenes')
    .select('slug')
    .eq('is_active', true)
    .is('subtitle', null);

  console.log(`\nОсталось без subtitle: ${stillMissing?.length || 0}`);
}

run();
