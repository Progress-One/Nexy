import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get all scenes that were likely affected (give/receive pairs)
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, role_direction, user_description, image_url, paired_with')
    .eq('is_active', true)
    .or('slug.ilike.%-give,slug.ilike.%-receive')
    .order('slug');

  console.log('=== ПРОВЕРКА СООТВЕТСТВИЯ КАРТИНОК ===\n');
  
  // Group by base slug (without -give/-receive)
  const pairs = new Map<string, any[]>();
  
  for (const s of scenes || []) {
    const baseSlug = s.slug.replace(/-(give|receive)$/, '');
    if (!pairs.has(baseSlug)) {
      pairs.set(baseSlug, []);
    }
    pairs.get(baseSlug)!.push(s);
  }

  let issueCount = 0;
  
  for (const [baseSlug, pair] of pairs) {
    if (pair.length !== 2) continue;
    
    const give = pair.find((s: any) => s.slug.endsWith('-give'));
    const receive = pair.find((s: any) => s.slug.endsWith('-receive'));
    
    if (!give || !receive) continue;
    
    // Check if they share the same image or have paired_with
    const sameImage = give.image_url === receive.image_url;
    const arePaired = give.paired_with === receive.slug || receive.paired_with === give.slug;
    
    // Check description perspective
    const giveDesc = give.user_description?.ru || '';
    const receiveDesc = receive.user_description?.ru || '';
    
    // give should have "Ты..." (active), receive should have "Он/Она..." (passive) or vice versa
    const giveHasTy = giveDesc.startsWith('Ты ');
    const receiveHasTy = receiveDesc.startsWith('Ты ');
    
    // Both starting with "Ты" is suspicious for complementary roles
    // Or check if the image prompt matches the description perspective
    
    console.log(`${baseSlug}:`);
    console.log(`  give (${give.role_direction}): "${giveDesc.substring(0, 50)}..."`);
    console.log(`  receive (${receive.role_direction}): "${receiveDesc.substring(0, 50)}..."`);
    console.log(`  same image: ${sameImage}, paired: ${arePaired}`);
    
    if (!sameImage && !arePaired) {
      console.log(`  ⚠️ РАЗНЫЕ КАРТИНКИ И НЕ СВЯЗАНЫ!`);
      issueCount++;
    }
    console.log('');
  }
  
  console.log(`\n=== ИТОГО: ${issueCount} потенциальных проблем ===`);
}
run();
