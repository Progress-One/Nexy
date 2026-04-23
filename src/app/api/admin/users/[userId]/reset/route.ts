import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { DB } from '@/lib/db/schema';

type ResetableTable =
  | 'scene_responses'
  | 'body_map_responses'
  | 'user_flow_state'
  | 'preference_profiles'
  | 'user_discovery_profiles'
  | 'excluded_preferences';

const ALLOWED_TABLES: ResetableTable[] = [
  'scene_responses',
  'body_map_responses',
  'user_flow_state',
  'preference_profiles',
  'user_discovery_profiles',
  'excluded_preferences',
];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { tables } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Default to all tables if not specified
    const requestedTables: string[] = tables || [...ALLOWED_TABLES];
    const tablesToReset = requestedTables.filter((t): t is ResetableTable =>
      (ALLOWED_TABLES as string[]).includes(t)
    );

    const results: Record<string, { deleted: number; error?: string }> = {};

    for (const table of tablesToReset) {
      try {
        const result = await db
          .deleteFrom(table as keyof DB)
          .where('user_id', '=', userId)
          .executeTakeFirst();

        results[table] = { deleted: Number(result.numDeletedRows) || 0 };
      } catch (err) {
        results[table] = { deleted: 0, error: (err as Error).message };
      }
    }

    console.log('[ResetUser] Results for', userId, ':', results);

    return NextResponse.json({
      success: true,
      userId,
      results,
    });
  } catch (error) {
    console.error('[ResetUser] Exception:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
