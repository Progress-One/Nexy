import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth';

// Use service role for admin operations (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { userId } = await params;
    const { tables } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Default to all tables if not specified
    const tablesToReset: string[] = tables || [
      'scene_responses',
      'body_map_responses',
      'user_flow_state',
      'preference_profiles',
      'user_discovery_profiles',
      'excluded_preferences',
    ];

    const results: Record<string, { deleted: number; error?: string }> = {};

    for (const table of tablesToReset) {
      try {
        const { error, count } = await supabase
          .from(table)
          .delete({ count: 'exact' })
          .eq('user_id', userId);

        if (error) {
          results[table] = { deleted: 0, error: error.message };
        } else {
          results[table] = { deleted: count || 0 };
        }
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
