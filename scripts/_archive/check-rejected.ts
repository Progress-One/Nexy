import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('id, slug, accepted, paired_with, user_description')
    .eq('category', 'onboarding')
    .neq('is_active', false)
    .eq('accepted', false)
    .order('slug');

  console.log(`=== REJECTED ONBOARDING SCENES (${data?.length || 0}) ===\n`);

  const byId: Record<string, any> = {};

  // Get all scenes for paired lookup
  const { data: all } = await supabase
    .from('scenes')
    .select('id, slug, accepted')
    .eq('category', 'onboarding')
    .neq('is_active', false);

  all?.forEach(s => byId[s.id] = s);

  // Group by give/receive pattern
  const gives: any[] = [];
  const receives: any[] = [];
  const other: any[] = [];

  data?.forEach(s => {
    if (s.slug.includes('-give') || s.slug.includes('-dom-')) {
      gives.push(s);
    } else if (s.slug.includes('-receive') || s.slug.includes('-sub-')) {
      receives.push(s);
    } else {
      other.push(s);
    }
  });

  console.log('PRIMARY (give/dom) - should show as cards:');
  gives.forEach(s => {
    const paired = s.paired_with ? byId[s.paired_with] : null;
    const pairedStatus = paired ? `paired=${paired.slug} (accepted=${paired.accepted})` : 'NO PAIR';
    console.log(`  ${s.slug}`);
    console.log(`    ${pairedStatus}`);
  });

  console.log('\nSECONDARY (receive/sub) - should be hidden if paired primary exists:');
  receives.forEach(s => {
    const paired = s.paired_with ? byId[s.paired_with] : null;
    const pairedInRejected = paired && paired.accepted === false;
    const willHide = paired && pairedInRejected;
    console.log(`  ${s.slug}`);
    console.log(`    paired=${paired?.slug || 'NONE'}, pairedAccepted=${paired?.accepted}`);
    console.log(`    → ${willHide ? 'HIDDEN (paired primary in rejected)' : 'SHOWN (no paired primary in rejected)'}`);
  });

  console.log('\nOTHER (no pattern):');
  other.forEach(s => {
    console.log(`  ${s.slug}`);
  });

  console.log('\n=== EXPECTED CARDS ===');
  const expectedCards = gives.length + receives.filter(s => {
    const paired = s.paired_with ? byId[s.paired_with] : null;
    return !paired || paired.accepted !== false;
  }).length + other.length;
  console.log(`Primary: ${gives.length}`);
  console.log(`Secondary showing: ${receives.filter(s => {
    const paired = s.paired_with ? byId[s.paired_with] : null;
    return !paired || paired.accepted !== false;
  }).length}`);
  console.log(`Other: ${other.length}`);
  console.log(`TOTAL expected cards: ${expectedCards}`);
}

check();
