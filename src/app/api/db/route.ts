import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API proxy for browser-side DB queries.
 * GET  /api/db?table=X&select=*&filters=[...]&order=[...]&limit=N&single=1
 * POST /api/db { table, op, data, filters }
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table');
  if (!table) return NextResponse.json({ error: 'table required' }, { status: 400 });

  const supabase = await createClient();
  let query = supabase.from(table).select(searchParams.get('select') || '*');

  const filters = JSON.parse(searchParams.get('filters') || '[]');
  for (const f of filters) {
    if (f.op === 'eq') query = query.eq(f.col, f.val);
    else if (f.op === 'neq') query = query.neq(f.col, f.val);
    else if (f.op === 'gt') query = query.gt(f.col, f.val);
    else if (f.op === 'gte') query = query.gte(f.col, f.val);
    else if (f.op === 'lt') query = query.lt(f.col, f.val);
    else if (f.op === 'lte') query = query.lte(f.col, f.val);
    else if (f.op === 'in') query = query.in(f.col, f.val);
    else if (f.op === 'is') query = query.is(f.col, f.val);
  }

  const order = JSON.parse(searchParams.get('order') || '[]');
  for (const o of order) {
    query = query.order(o.col, { ascending: o.asc });
  }

  const limit = searchParams.get('limit');
  if (limit) query = query.limit(parseInt(limit));

  if (searchParams.get('single') === '1') query = query.single();

  const { data, error } = await query;
  return NextResponse.json({ data, error });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { table, op, data, filters } = body;
  if (!table) return NextResponse.json({ error: 'table required' }, { status: 400 });

  const supabase = await createClient();

  if (op === 'insert') {
    const result = await supabase.from(table).insert(data);
    return NextResponse.json(result);
  }

  if (op === 'update') {
    let query = supabase.from(table).update(data);
    for (const f of (filters || [])) query = query.eq(f.col, f.val);
    const result = await query;
    return NextResponse.json(result);
  }

  if (op === 'delete') {
    let query = supabase.from(table).delete();
    for (const f of (filters || [])) query = query.eq(f.col, f.val);
    const result = await query;
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Unknown op' }, { status: 400 });
}
