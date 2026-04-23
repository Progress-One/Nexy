import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  // body: { categorySlug?: string, tag?: string, level: 'soft'|'hard', reason?: string }

  let categoryId: string | null = null;
  if (body.categorySlug) {
    const cat = await db
      .selectFrom('categories')
      .select('id')
      .where('slug', '=', body.categorySlug)
      .executeTakeFirst();
    categoryId = cat?.id ?? null;
  }

  try {
    await db
      .insertInto('excluded_preferences')
      .values({
        user_id: user.id,
        category_id: categoryId,
        excluded_tag: body.tag || null,
        exclusion_level: body.level || 'hard',
        reason: body.reason,
      })
      .onConflict(oc => oc.columns(['user_id', 'category_id']).doUpdateSet({
        excluded_tag: body.tag || null,
        exclusion_level: body.level || 'hard',
        reason: body.reason,
      }))
      .execute();
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await db
      .selectFrom('excluded_preferences as e')
      .leftJoin('categories as c', 'c.id', 'e.category_id')
      .select([
        'e.id',
        'e.user_id',
        'e.category_id',
        'e.excluded_tag',
        'e.exclusion_level',
        'e.reason',
        'e.reconsider_after_days',
        'e.excluded_at',
        'c.slug as category_slug',
        'c.name as category_name',
      ])
      .where('e.user_id', '=', user.id)
      .execute();

    // Reshape to include nested category like original contract
    const out = data.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      category_id: row.category_id,
      excluded_tag: row.excluded_tag,
      exclusion_level: row.exclusion_level,
      reason: row.reason,
      reconsider_after_days: row.reconsider_after_days,
      excluded_at: row.excluded_at,
      category: row.category_slug ? { slug: row.category_slug, name: row.category_name } : null,
    }));

    return NextResponse.json(out);
  } catch {
    return NextResponse.json([]);
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  await db
    .deleteFrom('excluded_preferences')
    .where('id', '=', id)
    .where('user_id', '=', user.id)
    .execute();

  return NextResponse.json({ success: true });
}
