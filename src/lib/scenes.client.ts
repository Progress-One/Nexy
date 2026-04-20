import type { Scene, SceneV2 } from '@/lib/types';
import type { SupabaseClient } from '@/lib/supabase/compat-types';
import { getAdaptiveScenes } from './scene-progression';

// Client-side version that accepts a Supabase client
export async function getFilteredScenesClient(
  supabaseClient: SupabaseClient,
  userId: string,
  options: {
    maxIntensity?: number;
    limit?: number;
    orderByPriority?: boolean;
    enableAdaptiveFlow?: boolean;
    enableDedupe?: boolean;
    userGender?: 'male' | 'female';
  } = {}
): Promise<Scene[]> {
  const {
    maxIntensity = 5,
    limit = 10,
    orderByPriority = false,
    enableAdaptiveFlow = true,
    enableDedupe = true,
    userGender,
  } = options;

  // Get excluded scene IDs with fast timeout
  // If RPC function fails or times out, fallback to empty array (non-blocking)
  let excludedIds: string[] = [];
  try {
    const rpcPromise = supabaseClient.rpc('get_excluded_scene_ids', { p_user_id: userId });
    const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 2000)
    );
    const { data: rpcExcludedIds, error: excludedError } = await Promise.race([rpcPromise, timeoutPromise]);

    if (excludedError) {
      console.warn('[getFilteredScenesClient] RPC excluded IDs skipped:', excludedError.message);
    } else if (rpcExcludedIds) {
      excludedIds = rpcExcludedIds;
    }
  } catch (e) {
    console.warn('[getFilteredScenesClient] RPC call failed, using empty exclusions');
  }

  // Get already seen scene IDs (exclude body_map virtual scenes from seen list)
  const { data: seen, error: seenError } = await supabaseClient
    .from('scene_responses')
    .select('scene_id, question_type')
    .eq('user_id', userId);
  
  if (seenError) {
    console.error('[getFilteredScenesClient] Error getting seen scenes:', seenError);
  }

  // Filter out body_map virtual scenes from seen list (they shouldn't block regular scenes)
  const seenIds = seen
    ?.filter(s => {
      // Exclude body_map virtual scenes (they have IDs like "bodymap-*-{userId}")
      if (s.scene_id && typeof s.scene_id === 'string' && s.scene_id.includes('bodymap-')) {
        return false;
      }
      // Exclude body_map question_type responses
      if (s.question_type === 'body_map') {
        return false;
      }
      return true;
    })
    .map(s => s.scene_id)
    .filter((id): id is string => {
      // Only include valid UUIDs (exclude virtual scene IDs like "bodymap-*-{userId}")
      if (!id || typeof id !== 'string') return false;
      // UUID format: 8-4-4-4-12 hex characters
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    }) || [];
  
  // Combine excluded IDs, filtering out invalid UUIDs
  const validExcludedIds = (excludedIds || []).filter((id): id is string => {
    if (!id || typeof id !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  });
  
  // Get paired_scene IDs to exclude (if user answered one, exclude the pair)
  let pairedIds: string[] = [];
  if (seenIds.length > 0) {
    const { data: pairedScenes } = await supabaseClient
      .from('scenes')
      .select('paired_scene')
      .in('id', seenIds)
      .not('paired_scene', 'is', null);

    const pairedSlugs = (pairedScenes || [])
      .map(s => s.paired_scene)
      .filter((slug): slug is string => Boolean(slug));

    // Resolve slugs to IDs
    if (pairedSlugs.length > 0) {
      const { data: pairedSceneIds } = await supabaseClient
        .from('scenes')
        .select('id')
        .in('slug', pairedSlugs);

      pairedIds = (pairedSceneIds || [])
        .map(s => s.id)
        .filter((id): id is string => Boolean(id));
    }
  }

  // Combine all excluded scene IDs
  const allExcluded = [...validExcludedIds, ...seenIds, ...pairedIds];

  console.log('[getFilteredScenesClient] Excluded scenes:', {
    excludedFromRPC: excludedIds?.length || 0,
    validExcludedIds: validExcludedIds.length,
    seenIds: seenIds.length,
    pairedIds: pairedIds.length,
    totalExcluded: allExcluded.length,
  });


  // Build query to get all eligible scenes
  // V2 composite scenes only, active only (no question_type filter - that column was removed)
  // Exclude clarification scenes - they should only appear after their parent scene
  let query = supabaseClient
    .from('scenes')
    .select('*')
    .eq('version', 2)
    .eq('is_active', true) // Filter out inactive scenes (mlm/wlw)
    .is('clarification_for', null) // Exclude clarification scenes from main flow
    .lte('intensity', maxIntensity);

  // Filter by for_gender field
  // male → sees scenes with for_gender = 'male' or null
  // female → sees scenes with for_gender = 'female' or null
  if (userGender) {
    query = query.or(`for_gender.eq.${userGender},for_gender.is.null`);
    console.log('[getFilteredScenesClient] Filtering by for_gender:', userGender);
  }

  if (allExcluded.length > 0) {
    // Use Supabase/PostgREST syntax: (uuid1,uuid2,uuid3) without quotes
    const excludedList = `(${allExcluded.join(',')})`;
    query = query.not('id', 'in', excludedList);
  }

  // For adaptive flow, we need all scenes to score them
  // Otherwise, use limit in query
  if (!enableAdaptiveFlow) {
    // Order by priority (lower = shown first) or by created_at
    if (orderByPriority) {
      query = query
        .order('priority', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    query = query.limit(limit);
  }

  const { data, error: queryError } = await query;

  if (queryError) {
    console.error('[getFilteredScenesClient] Error fetching scenes:', JSON.stringify(queryError, null, 2));
    console.error('[getFilteredScenesClient] Error details:', queryError.message, queryError.code, queryError.hint);
    return [];
  }

  if (!data || data.length === 0) {
    console.log('[getFilteredScenesClient] No scenes found in database query');
    return [];
  }

  console.log('[getFilteredScenesClient] Found', data.length, 'scenes before adaptive flow');

  // Use adaptive flow if enabled
  if (enableAdaptiveFlow) {
    const adaptiveScenes = await getAdaptiveScenes(
      supabaseClient,
      userId,
      data as Scene[],
      {
        maxIntensity,
        limit,
        enableDedupe,
        enableAdaptiveScoring: true,
      }
    );
    
    // If adaptive flow returns no scenes, fallback to priority-based sorting
    // This can happen if dedupe filters everything or user has no preferences yet
    if (adaptiveScenes.length === 0 && data && data.length > 0) {
      console.log('[getFilteredScenesClient] Adaptive flow returned no scenes, using fallback');
      // Filter V2 composite scenes
      const v2Scenes = (data as unknown as SceneV2[]).filter((s) => {
        return s.version === 2 && Array.isArray(s.elements);
      });
      
      // Sort by priority
      const sorted = [...v2Scenes].sort((a, b) => {
        const priorityA = a.priority || 50;
        const priorityB = b.priority || 50;
        return priorityA - priorityB;
      });
      
      return sorted.slice(0, limit) as unknown as Scene[];
    }
    
    return adaptiveScenes as unknown as Scene[];
  }

  return (data as Scene[]) || [];
}

// Get categories for scene tags
export async function getSceneCategories(
  supabaseClient: SupabaseClient,
  tags: string[]
): Promise<Array<{ slug: string; name: string }>> {
  if (!tags.length) return [];

  const { data } = await supabaseClient
    .from('tag_categories')
    .select('category:categories(slug, name)')
    .in('tag', tags);

  const categories = new Map<string, { slug: string; name: string }>();

  data?.forEach(item => {
    const rawCat = item.category as { slug: string; name: string } | { slug: string; name: string }[] | null;
    const cat = Array.isArray(rawCat) ? rawCat[0] : rawCat;
    if (cat && !categories.has(cat.slug)) {
      categories.set(cat.slug, cat);
    }
  });

  return Array.from(categories.values());
}
