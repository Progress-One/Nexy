import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  // Get all active onboarding scenes
  const { data } = await supabase
    .from('scenes')
    .select('slug, title, role_direction, paired_with, user_description, is_active')
    .eq('category', 'onboarding')
    .eq('is_active', true)
    .order('slug');

  console.log('Looking for submission/domination scenes...\n');

  data?.forEach(s => {
    const title = s.title?.ru || s.title?.en || '';
    const desc = s.user_description?.ru || '';
    // Check for submission-related keywords
    if (title.includes('одчин') || desc.includes('колен') || desc.includes('ошейник') || desc.includes('поводок')) {
      console.log(s.slug);
      console.log('  title:', title);
      console.log('  role:', s.role_direction);
      console.log('  paired:', s.paired_with || 'none');
      console.log('  RU:', desc);
      console.log('');
    }
  });

  console.log('\n--- All slugs for reference ---');
  data?.forEach(s => console.log(s.slug));
}

check().catch(console.error);
