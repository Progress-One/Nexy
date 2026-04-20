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

function mergeVariants(v1: ImageVariant[], v2: ImageVariant[]): ImageVariant[] {
  const urlSet = new Set<string>();
  const merged: ImageVariant[] = [];

  for (const v of [...v1, ...v2]) {
    if (!v.url || v.is_placeholder) continue;
    const base = getBaseUrl(v.url);
    if (!urlSet.has(base)) {
      urlSet.add(base);
      merged.push(v);
    }
  }

  return merged;
}

async function sync() {
  // Get all scenes with links
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, image_variants, paired_with, shared_images_with, accepted');

  if (!scenes) {
    console.log('No scenes found');
    return;
  }

  const byId: Record<string, any> = {};
  scenes.forEach(s => byId[s.id] = s);

  // Track processed pairs to avoid duplicates
  const processed = new Set<string>();
  let syncCount = 0;

  for (const scene of scenes) {
    // Collect all linked scene IDs
    const linkedIds = [scene.paired_with, scene.shared_images_with].filter(Boolean) as string[];

    for (const linkedId of linkedIds) {
      // Create unique pair key
      const pairKey = [scene.id, linkedId].sort().join('|');
      if (processed.has(pairKey)) continue;
      processed.add(pairKey);

      const linked = byId[linkedId];
      if (!linked) continue;

      const v1 = scene.image_variants || [];
      const v2 = linked.image_variants || [];

      // Skip if both empty
      if (v1.length === 0 && v2.length === 0) continue;

      // Merge variants
      const merged = mergeVariants(v1, v2);

      // Check if update needed
      const needsUpdate1 = merged.length !== v1.length;
      const needsUpdate2 = merged.length !== v2.length;

      if (needsUpdate1 || needsUpdate2) {
        console.log(`\nSYNC: ${scene.slug} ↔ ${linked.slug}`);
        console.log(`  ${scene.slug}: ${v1.length} → ${merged.length} variants`);
        console.log(`  ${linked.slug}: ${v2.length} → ${merged.length} variants`);

        // Update both scenes
        if (needsUpdate1) {
          await supabase
            .from('scenes')
            .update({ image_variants: merged })
            .eq('id', scene.id);
        }

        if (needsUpdate2) {
          await supabase
            .from('scenes')
            .update({ image_variants: merged })
            .eq('id', linkedId);
        }

        syncCount++;
      }
    }
  }

  console.log(`\n=== SYNCED ${syncCount} PAIRS ===`);
}

sync();
