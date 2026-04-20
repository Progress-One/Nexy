import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, elements, is_active')
    .eq('is_active', true);

  // Find scenes with -give or -receive suffix
  const variants = (scenes || []).filter(s =>
    s.slug.endsWith('-give') || s.slug.endsWith('-receive')
  );

  // Group by base slug
  const byBase: Record<string, { base: any, give: any, receive: any }> = {};

  for (const s of scenes || []) {
    const baseSlug = s.slug.replace(/-(give|receive)$/, '');
    if (!byBase[baseSlug]) {
      byBase[baseSlug] = { base: null, give: null, receive: null };
    }

    if (s.slug.endsWith('-give')) {
      byBase[baseSlug].give = s;
    } else if (s.slug.endsWith('-receive')) {
      byBase[baseSlug].receive = s;
    } else {
      byBase[baseSlug].base = s;
    }
  }

  // Find triads (base + give + receive)
  const triads = Object.entries(byBase).filter(([_, v]) => v.give && v.receive);

  console.log(`Total active scenes with -give/-receive variants: ${triads.length}`);
  console.log(`\nTriads with elements in variants:\n`);

  let withElements = 0;
  let withoutElements = 0;

  for (const [slug, { base, give, receive }] of triads.sort((a, b) => a[0].localeCompare(b[0]))) {
    const baseElements = base?.elements?.length || 0;
    const giveElements = give?.elements?.length || 0;
    const receiveElements = receive?.elements?.length || 0;

    if (giveElements > 0 || receiveElements > 0) {
      withElements++;
      const baseStatus = base ? (base.is_active ? '✅' : '❌') : '  ';
      console.log(`${baseStatus} ${slug}`);
      console.log(`   base: ${baseElements}, give: ${giveElements}, receive: ${receiveElements}`);
    } else {
      withoutElements++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Triads with elements in variants: ${withElements}`);
  console.log(`Triads without elements in variants: ${withoutElements}`);
}

run();
