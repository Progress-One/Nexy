import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Get scene responses with scene info via join
    let sceneResponses: unknown[] = [];
    try {
      sceneResponses = await db
        .selectFrom('scene_responses as sr')
        .leftJoin('scenes as s', 's.id', 'sr.scene_id')
        .select([
          'sr.id',
          'sr.scene_id',
          'sr.liked',
          'sr.rating',
          'sr.elements_selected',
          'sr.follow_up_answers',
          'sr.created_at',
          's.slug as scene_slug',
          's.title as scene_title',
          's.category as scene_category',
        ])
        .where('sr.user_id', '=', userId)
        .orderBy('sr.created_at', 'desc')
        .execute();
    } catch (sceneError) {
      console.error('[UserResponses] Scene error:', sceneError);
    }

    // Get body map responses
    let bodyMapResponses: unknown[] = [];
    try {
      bodyMapResponses = await db
        .selectFrom('body_map_responses')
        .selectAll()
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .execute();
    } catch (bodyMapError) {
      console.error('[UserResponses] Body map error:', bodyMapError);
    }

    // Get user flow state
    let flowState: unknown = null;
    try {
      flowState = (await db
        .selectFrom('user_flow_state')
        .selectAll()
        .where('user_id', '=', userId)
        .executeTakeFirst()) ?? null;
    } catch (flowError) {
      console.error('[UserResponses] Flow state error:', flowError);
    }

    // Get preference profile
    let preferenceProfile: unknown = null;
    try {
      preferenceProfile = (await db
        .selectFrom('preference_profiles')
        .selectAll()
        .where('user_id', '=', userId)
        .executeTakeFirst()) ?? null;
    } catch (prefError) {
      console.error('[UserResponses] Preference error:', prefError);
    }

    // Get discovery profile
    let discoveryProfile: unknown = null;
    try {
      discoveryProfile = (await db
        .selectFrom('user_discovery_profiles')
        .selectAll()
        .where('user_id', '=', userId)
        .executeTakeFirst()) ?? null;
    } catch (discError) {
      console.error('[UserResponses] Discovery error:', discError);
    }

    // Get excluded preferences
    let excludedPrefs: unknown[] = [];
    try {
      excludedPrefs = await db
        .selectFrom('excluded_preferences')
        .selectAll()
        .where('user_id', '=', userId)
        .execute();
    } catch (exclError) {
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
