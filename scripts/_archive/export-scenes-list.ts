import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function exportScenes() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, title, user_description, category, role_direction, is_active')
    .eq('is_active', true)
    .not('slug', 'ilike', '%onboarding%')
    .not('slug', 'ilike', '%-give')
    .not('slug', 'ilike', '%-receive')
    .order('category')
    .order('slug');

  const byCategory: Record<string, any[]> = {};
  for (const s of scenes || []) {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category].push(s);
  }

  for (const [category, categoryScenes] of Object.entries(byCategory)) {
    console.log(`\n## ${category.toUpperCase()}\n`);
    for (const s of categoryScenes) {
      const title = (s.title as any)?.ru || '';
      const desc = (s.user_description as any)?.ru || '';
      console.log(`**${title}** (\`${s.slug}\`)`);
      console.log(`${desc}\n`);
    }
  }
}

exportScenes();
