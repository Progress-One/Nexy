import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { DB } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth';

/**
 * ADMIN-ONLY DB proxy.
 *
 * In Phase 4b (April 2026) every privacy-sensitive client caller was migrated
 * to typed per-feature endpoints. This proxy now only serves admin tools that
 * still construct ad-hoc Kysely queries from the browser (admin pages under
 * /app/admin/*). Regular user routes MUST NOT use this — use a typed route.
 *
 * Authorization: `requireAdmin()` short-circuits with 401/403 for non-admins.
 */

type Filter = { col: string; op: string; val: unknown };

function coerce(v: string): unknown {
  if (v === 'null') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function supabaseOpToKysely(op: string): string {
  switch (op) {
    case 'eq': return '=';
    case 'neq': return '!=';
    case 'gt': return '>';
    case 'gte': return '>=';
    case 'lt': return '<';
    case 'lte': return '<=';
    default: return '=';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilter(qb: any, f: Filter): any {
  if (f.col === '__or' && f.op === 'or') {
    const conditions = String(f.val).split(',').map((c) => c.trim());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return qb.where((eb: any) =>
      eb.or(
        conditions.map((c) => {
          const m = c.match(/^(\w+)\.(\w+)\.(.+)$/);
          if (!m) return eb.lit(false);
          const [, col, op, val] = m;
          const kop = supabaseOpToKysely(op);
          return eb(col, kop as never, coerce(val));
        })
      )
    );
  }
  if (f.col === '__range' && f.op === 'range') {
    const [from, to] = f.val as [number, number];
    return qb.offset(from).limit(to - from + 1);
  }
  switch (f.op) {
    case 'eq': return qb.where(f.col, '=', f.val);
    case 'neq': return qb.where(f.col, '!=', f.val);
    case 'gt': return qb.where(f.col, '>', f.val);
    case 'gte': return qb.where(f.col, '>=', f.val);
    case 'lt': return qb.where(f.col, '<', f.val);
    case 'lte': return qb.where(f.col, '<=', f.val);
    case 'in': return qb.where(f.col, 'in', f.val as unknown[]);
    case 'is': return qb.where(f.col, 'is', f.val);
    case 'overlaps': return qb.where(f.col, '&&', f.val);
    case 'contains': return qb.where(f.col, '@>', f.val);
    case 'not_is': return qb.where(f.col, 'is not', f.val);
    default:
      throw new Error(`Unsupported filter op: ${f.op}`);
  }
}

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const params = req.nextUrl.searchParams;
    const table = params.get('table') as keyof DB;
    if (!table) return NextResponse.json({ data: null, error: { message: 'Missing table' } }, { status: 400 });
    const select = params.get('select') || '*';
    const filters: Filter[] = JSON.parse(params.get('filters') || '[]');
    const order: Array<{ col: string; asc: boolean }> = JSON.parse(params.get('order') || '[]');
    const limit = params.get('limit') ? Number(params.get('limit')) : undefined;
    const single = params.get('single') === '1';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let qb: any =
      select === '*'
        ? db.selectFrom(table).selectAll()
        : db.selectFrom(table).select(select.split(',').map((s) => s.trim()) as never);

    for (const f of filters) qb = applyFilter(qb, f);
    for (const o of order) qb = qb.orderBy(o.col, o.asc ? 'asc' : 'desc');
    if (limit != null) qb = qb.limit(limit);

    const data = single ? await qb.executeTakeFirst() : await qb.execute();
    return NextResponse.json({ data: data ?? null, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ data: null, error: { message } }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const { table, op, data, filters = [], opts } = body as {
      table: keyof DB;
      op: 'insert' | 'upsert' | 'update' | 'delete';
      data: unknown;
      filters?: Filter[];
      opts?: { onConflict?: string };
    };

    if (op === 'insert' || op === 'upsert') {
      const rows = Array.isArray(data) ? data : [data];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let qb: any = db.insertInto(table).values(rows as never);
      if (op === 'upsert' && opts?.onConflict) {
        const conflictCols = opts.onConflict.split(',').map((c) => c.trim());
        const first = rows[0] as Record<string, unknown>;
        const updateCols = Object.fromEntries(
          Object.keys(first).filter((c) => !conflictCols.includes(c)).map((c) => [c, first[c]])
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        qb = qb.onConflict((oc: any) => oc.columns(conflictCols).doUpdateSet(updateCols));
      }
      const inserted = await qb.returningAll().execute();
      return NextResponse.json({ data: inserted, error: null });
    }

    if (op === 'update') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let qb: any = db.updateTable(table).set(data as never);
      for (const f of filters) qb = applyFilter(qb, f);
      const updated = await qb.returningAll().execute();
      return NextResponse.json({ data: updated, error: null });
    }

    if (op === 'delete') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let qb: any = db.deleteFrom(table);
      for (const f of filters) qb = applyFilter(qb, f);
      const deleted = await qb.returningAll().execute();
      return NextResponse.json({ data: deleted, error: null });
    }

    return NextResponse.json({ data: null, error: { message: 'Unknown op' } }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ data: null, error: { message } }, { status: 400 });
  }
}
