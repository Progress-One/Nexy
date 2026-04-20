import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * Delete a scene by ID or slug
 *
 * POST body:
 * - id: string (UUID) - delete by ID
 * - slug: string - delete by slug
 */
export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = await createServiceClient();

  try {
    const body = await req.json();
    const { id, slug } = body;

    if (!id && !slug) {
      return NextResponse.json(
        { error: 'Either id or slug is required' },
        { status: 400 }
      );
    }

    let query = supabase.from('scenes').delete();

    if (id) {
      query = query.eq('id', id);
    } else if (slug) {
      query = query.eq('slug', slug);
    }

    const { error, count } = await query;

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

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
