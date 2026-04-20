import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('id, slug, paired_with')
    .ilike('slug', '%lingerie%')
    .eq('category', 'onboarding')
    .neq('is_active', false)
    .order('slug');

  console.log('=== EXACT UUID CHECK ===\n');

  const idToSlug: Record<string, string> = {};
  data?.forEach(s => idToSlug[s.id] = s.slug);

  data?.forEach(s => {
    console.log(`${s.slug}`);
    console.log(`  id:         ${s.id}`);
    console.log(`  paired_with: ${s.paired_with || 'NULL'}`);
    if (s.paired_with) {
      const pairedSlug = idToSlug[s.paired_with];
      if (pairedSlug) {
        console.log(`  → points to: ${pairedSlug}`);
      } else {
        console.log(`  → ERROR: UUID not found in active scenes!`);
      }
    }
    console.log('');
  });

  // Check for mismatches
  console.log('=== PAIRING VALIDATION ===\n');
  data?.forEach(s => {
    if (s.paired_with) {
      const paired = data?.find(x => x.id === s.paired_with);
      if (paired) {
        if (paired.paired_with === s.id) {
          console.log(`✓ ${s.slug} ↔ ${paired.slug} (mutual)`);
        } else {
          console.log(`✗ ${s.slug} → ${paired.slug} BUT ${paired.slug} → ${idToSlug[paired.paired_with!] || 'NULL'}`);
        }
      }
    }
  });
}

check();
