import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function findUnlinked() {
  // Find all discovery scenes without shared_images_with
  const { data: unlinked } = await supabase
    .from('scenes')
    .select('slug, title, user_description, category, role_direction')
    .is('shared_images_with', null)
    .not('slug', 'ilike', '%onboarding%')
    .eq('is_active', true)
    .order('category')
    .order('slug');

  console.log('=== UNLINKED DISCOVERY SCENES ===\n');

  let currentCategory = '';
  for (const s of unlinked || []) {
    if (s.category !== currentCategory) {
      currentCategory = s.category || 'unknown';
      console.log(`\n--- ${currentCategory.toUpperCase()} ---`);
    }
    const title = (s.title as any)?.ru || '';
    console.log(`${s.slug} (${s.role_direction}) - ${title}`);
  }

  console.log(`\n\nTotal unlinked: ${unlinked?.length || 0}`);
}

findUnlinked();
