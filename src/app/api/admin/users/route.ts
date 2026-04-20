import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/compat-types';
import { requireAdmin } from '@/lib/admin-auth';

// Use service role for admin operations (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    // Get all profiles with response counts
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, gender, interested_in, onboarding_completed, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('[Users] Error fetching profiles:', profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Get response counts for each user
    const usersWithCounts = await Promise.all(
      (profiles || []).map(async (profile) => {
        // Count scene responses
        const { count: sceneCount } = await supabase
          .from('scene_responses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id);

        // Count body map responses
        const { count: bodyMapCount } = await supabase
          .from('body_map_responses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id);

        // Check if has flow state
        const { data: flowState } = await supabase
          .from('user_flow_state')
          .select('seen_scenes, calibration_complete')
          .eq('user_id', profile.id)
          .single();

        // Get user email from auth.users
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);

        return {
          ...profile,
          email: authUser?.user?.email || 'unknown',
          scene_responses_count: sceneCount || 0,
          body_map_responses_count: bodyMapCount || 0,
          seen_scenes_count: flowState?.seen_scenes?.length || 0,
          calibration_complete: flowState?.calibration_complete || false,
          total_responses: (sceneCount || 0) + (bodyMapCount || 0),
        };
      })
    );

    // Sort by total responses (most active first)
    usersWithCounts.sort((a, b) => b.total_responses - a.total_responses);

    return NextResponse.json({ users: usersWithCounts });
  } catch (error) {
    console.error('[Users] Exception:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
