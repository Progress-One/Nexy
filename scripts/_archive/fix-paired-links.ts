import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get all give/receive scenes
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, paired_with')
    .eq('is_active', true)
    .or('slug.ilike.%-give,slug.ilike.%-receive')
    .order('slug');

  if (!scenes) {
    console.log('No scenes found');
    return;
  }

  // Group by base slug
  const pairs = new Map<string, any[]>();
  for (const s of scenes) {
    const baseSlug = s.slug.replace(/-(give|receive)$/, '');
    if (!pairs.has(baseSlug)) {
      pairs.set(baseSlug, []);
    }
    pairs.get(baseSlug)!.push(s);
  }

  let fixedCount = 0;
  let brokenCount = 0;

  for (const [baseSlug, pair] of pairs) {
    if (pair.length !== 2) continue;

    const give = pair.find((s: any) => s.slug.endsWith('-give'));
    const receive = pair.find((s: any) => s.slug.endsWith('-receive'));

    if (!give || !receive) continue;

    // Check if paired_with is correct
    const givePointsToReceive = give.paired_with === receive.id;
    const receivePointsToGive = receive.paired_with === give.id;

    if (!givePointsToReceive || !receivePointsToGive) {
      brokenCount++;
      console.log(`\nBROKEN: ${baseSlug}`);
      console.log(`  give.id: ${give.id}`);
      console.log(`  give.paired_with: ${give.paired_with} (should be ${receive.id})`);
      console.log(`  receive.id: ${receive.id}`);
      console.log(`  receive.paired_with: ${receive.paired_with} (should be ${give.id})`);

      // Fix: update both to point to each other
      if (!givePointsToReceive) {
        await supabase
          .from('scenes')
          .update({ paired_with: receive.id })
          .eq('id', give.id);
        console.log(`  FIXED: give now points to receive`);
      }

      if (!receivePointsToGive) {
        await supabase
          .from('scenes')
          .update({ paired_with: give.id })
          .eq('id', receive.id);
        console.log(`  FIXED: receive now points to give`);
      }

      fixedCount++;
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total pairs: ${pairs.size}`);
  console.log(`Broken: ${brokenCount}`);
  console.log(`Fixed: ${fixedCount}`);
}

run();
