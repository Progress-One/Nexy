import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/compat-types';

// Use service role for admin operations (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Get scene responses with scene info
    const { data: sceneResponses, error: sceneError } = await supabase
      .from('scene_responses')
      .select(`
        id,
        scene_id,
        liked,
        rating,
        elements_selected,
        follow_up_answers,
        created_at,
        scenes (
          slug,
          title,
          category
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (sceneError) {
      console.error('[UserResponses] Scene error:', sceneError);
    }

    // Get body map responses
    const { data: bodyMapResponses, error: bodyMapError } = await supabase
      .from('body_map_responses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (bodyMapError) {
      console.error('[UserResponses] Body map error:', bodyMapError);
    }

    // Get user flow state
    const { data: flowState, error: flowError } = await supabase
      .from('user_flow_state')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (flowError && flowError.code !== 'PGRST116') {
      console.error('[UserResponses] Flow state error:', flowError);
    }

    // Get preference profile
    const { data: preferenceProfile, error: prefError } = await supabase
      .from('preference_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (prefError && prefError.code !== 'PGRST116') {
      console.error('[UserResponses] Preference error:', prefError);
    }

    // Get discovery profile
    const { data: discoveryProfile, error: discError } = await supabase
      .from('user_discovery_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (discError && discError.code !== 'PGRST116') {
      console.error('[UserResponses] Discovery error:', discError);
    }

    // Get excluded preferences
    const { data: excludedPrefs, error: exclError } = await supabase
      .from('excluded_preferences')
      .select('*')
      .eq('user_id', userId);

    if (exclError) {
      console.error('[UserResponses] Excluded error:', exclError);
    }

    return NextResponse.json({
      sceneResponses: sceneResponses || [],
      bodyMapResponses: bodyMapResponses || [],
      flowState: flowState || null,
      preferenceProfile: preferenceProfile || null,
      discoveryProfile: discoveryProfile || null,
      excludedPreferences: excludedPrefs || [],
    });
  } catch (error) {
    console.error('[UserResponses] Exception:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
