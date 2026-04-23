import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Delete a scene by ID or slug
 *
 * POST body:
 * - id: string (UUID) - delete by ID
 * - slug: string - delete by slug
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, slug } = body;

    if (!id && !slug) {
      return NextResponse.json(
        { error: 'Either id or slug is required' },
        { status: 400 }
      );
    }

    let query = db.deleteFrom('scenes');

    if (id) {
      query = query.where('id', '=', id);
    } else if (slug) {
      query = query.where('slug', '=', slug);
    }

    await query.execute();

    return NextResponse.json({
      success: true,
      deleted: id || slug,
    });
  } catch (error) {
    const err = error as Error;
    console.error('Delete scene error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
