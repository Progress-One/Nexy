import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

interface ImageVariant {
  url: string;
  prompt: string;
  created_at: string;
  qa_status?: 'passed' | 'failed' | null;
  is_placeholder?: boolean;
}

function getBaseUrl(url: string): string {
  return url?.split('?')[0] || '';
}

function mergeVariants(...arrays: ImageVariant[][]): ImageVariant[] {
  const urlSet = new Set<string>();
  const merged: ImageVariant[] = [];

  for (const arr of arrays) {
    for (const v of arr) {
      if (!v.url || v.is_placeholder) continue;
      const base = getBaseUrl(v.url);
      if (!urlSet.has(base)) {
        urlSet.add(base);
        merged.push(v);
      }
    }
  }

  return merged;
}

async function sync() {
  // All 4 scenes that should share images
  const slugs = [
    'onboarding-praise-give-hetero-f',
    'onboarding-praise-receive-hetero-m',
    'praise-she-praises-him-give',
    'praise-she-praises-him-receive',
  ];

  const { data } = await supabase
    .from('scenes')
    .select('id, slug, image_url, image_variants, accepted')
    .in('slug', slugs);

  if (!data || data.length < 4) {
    console.log('Not all scenes found');
    return;
  }

  // Collect all variants
  const allVariants = data.map(s => s.image_variants || []);
  const merged = mergeVariants(...allVariants);

  console.log('Variants per scene:');
  data.forEach(s => console.log(`  ${s.slug}: ${(s.image_variants || []).length}`));
  console.log(`\nMerged total: ${merged.length} unique variants`);

  // Find the best image_url (from scene with most variants originally)
  const best = data.reduce((a, b) =>
    (a.image_variants?.length || 0) >= (b.image_variants?.length || 0) ? a : b
  );

  console.log(`\nUsing image_url from: ${best.slug}`);
  console.log(`Best image_url: ${best.image_url?.substring(0, 80)}...`);

  // Update all scenes
  for (const scene of data) {
    console.log(`\nUpdating ${scene.slug}...`);
    await supabase
      .from('scenes')
      .update({
        image_url: best.image_url,
        image_variants: merged,
        accepted: best.accepted,
      })
      .eq('id', scene.id);
    console.log(`  Done (${merged.length} variants)`);
  }

  console.log('\n=== ALL SYNCED ===');
}

sync();
