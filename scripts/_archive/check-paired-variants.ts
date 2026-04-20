import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('id, slug, paired_with, image_url, image_variants, accepted')
    .ilike('slug', '%lingerie%')
    .eq('category', 'onboarding')
    .neq('is_active', false)
    .order('slug');

  console.log('=== LINGERIE PAIRED SCENES ===\n');

  const byId: Record<string, any> = {};
  data?.forEach(s => byId[s.id] = s);

  data?.forEach(s => {
    const variants = s.image_variants || [];
    const variantUrls = variants.map((v: any) => v.url?.split('/').pop()?.substring(0, 30) || 'empty');

    console.log(`${s.slug}`);
    console.log(`  accepted: ${s.accepted}`);
    console.log(`  variants (${variants.length}):`);
    variantUrls.forEach((u: string, i: number) => {
      const v = variants[i];
      console.log(`    [${i}] ${u} | qa: ${v.qa_status || 'null'}`);
    });

    if (s.paired_with) {
      const paired = byId[s.paired_with];
      if (paired) {
        const pVariants = paired.image_variants || [];
        console.log(`  paired: ${paired.slug} (${pVariants.length} variants)`);
      }
    }
    console.log('');
  });
}

check();
