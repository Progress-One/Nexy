import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST /api/wishlist
 * Add user to orientation wishlist (for unavailable orientations like gay/bi)
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requested_orientation } = await req.json();

    // Validate orientation
    const validOrientations = ['gay_male', 'gay_female', 'bisexual'];
    if (!validOrientations.includes(requested_orientation)) {
      return NextResponse.json(
        { error: 'Invalid orientation. Must be: gay_male, gay_female, or bisexual' },
        { status: 400 }
      );
    }

    const data = await db
      .insertInto('orientation_wishlist')
      .values({
        user_id: user.id,
        requested_orientation,
      })
      .onConflict(oc => oc.columns(['user_id', 'requested_orientation']).doUpdateSet({
        requested_orientation,
      }))
      .returningAll()
      .executeTakeFirst();

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Wishlist] Exception:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wishlist
 * Get user's wishlist entries
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await db
      .selectFrom('orientation_wishlist')
      .selectAll()
      .where('user_id', '=', user.id)
      .execute();

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('[Wishlist] Exception:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
