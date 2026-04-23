import type { Scene } from '@/lib/types';
import type { createClient } from '@/lib/http-client/client';

type BrowserClient = ReturnType<typeof createClient>;

/**
 * Client-side helper for fetching adaptive/filtered discovery scenes.
 *
 * Previously this module pulled the adaptive-scoring logic directly into the
 * browser bundle via `scene-progression.ts`, which in turn imported the
 * server-only `db` module (pg). After the Kysely migration that caused
 * "Module not found: Can't resolve 'dns'/'fs'/'net'/'tls'" errors at build
 * time.
 *
 * All heavy lifting now lives in `/api/discovery/scenes` and this wrapper
 * simply fetches from it. The `SupabaseClient` parameter is kept for
 * backward-compatible call sites but is currently unused — reads happen
 * server-side using the authenticated session cookie.
 */
export async function getFilteredScenesClient(
  _supabaseClient: BrowserClient,
  _userId: string,
  options: {
    maxIntensity?: number;
    limit?: number;
    orderByPriority?: boolean;
    enableAdaptiveFlow?: boolean;
    enableDedupe?: boolean;
    userGender?: 'male' | 'female';
  } = {}
): Promise<Scene[]> {
  try {
    const res = await fetch('/api/discovery/scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options }),
    });
    if (!res.ok) {
      console.error(
        '[getFilteredScenesClient] API returned',
        res.status,
        await res.text().catch(() => ''),
      );
      return [];
    }
    const json = (await res.json()) as { scenes?: Scene[] };
    return json.scenes ?? [];
  } catch (err) {
    console.error('[getFilteredScenesClient] Error:', err);
    return [];
  }
}

/**
 * Get categories for scene tags.
 */
export async function getSceneCategories(
  supabaseClient: BrowserClient,
  tags: string[]
): Promise<Array<{ slug: string; name: string }>> {
  if (!tags.length) return [];

  const { data } = await supabaseClient
    .from('tag_categories')
    .select('category:categories(slug, name)')
    .in('tag', tags);

  const categories = new Map<string, { slug: string; name: string }>();

  data?.forEach((item) => {
    const rawCat = item.category as
      | { slug: string; name: string }
      | { slug: string; name: string }[]
      | null;
    const cat = Array.isArray(rawCat) ? rawCat[0] : rawCat;
    if (cat && !categories.has(cat.slug)) {
      categories.set(cat.slug, cat);
    }
  });

  return Array.from(categories.values());
}
