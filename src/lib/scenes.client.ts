import type { Scene } from '@/lib/types';

/**
 * Client-side helper for fetching adaptive/filtered discovery scenes.
 *
 * All heavy lifting lives in `/api/discovery/scenes` and this wrapper simply
 * fetches from it. The first parameter is unused but kept for backwards
 * compatibility with legacy call sites.
 */
export async function getFilteredScenesClient(
  _supabaseClient: unknown,
  _userId: string,
  options: {
    maxIntensity?: number;
    limit?: number;
    orderByPriority?: boolean;
    enableAdaptiveFlow?: boolean;
    enableDedupe?: boolean;
    userGender?: 'male' | 'female';
  } = {},
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
