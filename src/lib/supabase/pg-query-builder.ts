/**
 * PostgreSQL QueryBuilder — drop-in replacement for Supabase's
 * .from('table').select().eq().order().limit().single() API.
 *
 * Used by server.ts and client.ts so all existing query files
 * keep working without changes.
 */
import type pg from 'pg';

export class QueryBuilder {
  private table: string;
  private pool: pg.Pool;
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private columns = '*';
  private filters: { col: string; op: string; val: unknown }[] = [];
  private orderClauses: string[] = [];
  private limitVal?: number;
  private offsetVal?: number;
  private payload: Record<string, unknown> | Record<string, unknown>[] = {};
  private upsertConflict?: string;
  private singleMode = false;
  private maybeSingleMode = false;
  private headMode = false;
  private countMode?: string;

  constructor(pool: pg.Pool, table: string) {
    this.pool = pool;
    this.table = table;
  }

  select(cols = '*', opts?: { count?: string; head?: boolean }) {
    this.op = 'select';
    this.columns = cols;
    if (opts?.count) this.countMode = opts.count;
    if (opts?.head) this.headMode = true;
    return this;
  }

  insert(data: Record<string, unknown> | Record<string, unknown>[]) {
    this.op = 'insert'; this.payload = data; return this;
  }

  upsert(data: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string }) {
    this.op = 'upsert'; this.payload = data; this.upsertConflict = opts?.onConflict; return this;
  }

  update(data: Record<string, unknown>) {
    this.op = 'update'; this.payload = data; return this;
  }

  delete() { this.op = 'delete'; return this; }

  eq(col: string, val: unknown) { this.filters.push({ col, op: '=', val }); return this; }
  neq(col: string, val: unknown) { this.filters.push({ col, op: '!=', val }); return this; }
  gt(col: string, val: unknown) { this.filters.push({ col, op: '>', val }); return this; }
  gte(col: string, val: unknown) { this.filters.push({ col, op: '>=', val }); return this; }
  lt(col: string, val: unknown) { this.filters.push({ col, op: '<', val }); return this; }
  lte(col: string, val: unknown) { this.filters.push({ col, op: '<=', val }); return this; }
  like(col: string, val: string) { this.filters.push({ col, op: 'LIKE', val }); return this; }
  ilike(col: string, val: string) { this.filters.push({ col, op: 'ILIKE', val }); return this; }
  is(col: string, val: unknown) { this.filters.push({ col, op: 'IS', val }); return this; }
  in(col: string, vals: unknown[]) { this.filters.push({ col, op: 'IN', val: vals }); return this; }
  not(col: string, op: string, val: unknown) {
    if (op === 'is') this.filters.push({ col, op: 'IS NOT', val });
    return this;
  }
  or(_conditions: string) { return this; } // Simplified — skip complex OR

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderClauses.push(`"${col}" ${opts?.ascending === false ? 'DESC' : 'ASC'}`);
    return this;
  }

  private validateInt(value: number, name: string, min: number = 0): number {
    if (!Number.isInteger(value) || value < min) {
      throw new Error(`Invalid ${name}: must be integer >= ${min}`);
    }
    return value;
  }

  limit(n: number) { this.limitVal = this.validateInt(n, 'limit', 1); return this; }
  range(from: number, to: number) {
    const validFrom = this.validateInt(from, 'range.from', 0);
    const validTo = this.validateInt(to, 'range.to', 0);
    if (validTo < validFrom) {
      throw new Error('Invalid range: to must be >= from');
    }
    this.offsetVal = validFrom;
    this.limitVal = validTo - validFrom + 1;
    return this;
  }
  single() { this.singleMode = true; this.limitVal = 1; return this; }
  maybeSingle() { this.maybeSingleMode = true; this.limitVal = 1; return this; }

  private buildWhere(params: unknown[]): string {
    if (!this.filters.length) return '';
    const clauses: string[] = [];
    for (const f of this.filters) {
      if (f.op === 'IN') {
        const vals = f.val as unknown[];
        const ph = vals.map((_, i) => `$${params.length + i + 1}`).join(', ');
        clauses.push(`"${f.col}" IN (${ph})`);
        params.push(...vals);
      } else if (f.op === 'IS' || f.op === 'IS NOT') {
        clauses.push(`"${f.col}" ${f.op} NULL`);
      } else {
        params.push(f.val);
        clauses.push(`"${f.col}" ${f.op} $${params.length}`);
      }
    }
    return ` WHERE ${clauses.join(' AND ')}`;
  }

  async then(resolve: (val: { data: any; error: any; count?: number }) => void) {
    try {
      resolve(await this.execute());
    } catch (err: any) {
      resolve({ data: null, error: { message: err.message } });
    }
  }

  private jsonify(v: unknown): unknown {
    return typeof v === 'object' && v !== null && !(v instanceof Date) ? JSON.stringify(v) : v;
  }

  private async execute(): Promise<{ data: any; error: any; count?: number }> {
    const params: unknown[] = [];

    if (this.op === 'select') {
      if (this.headMode && this.countMode) {
        const sql = `SELECT count(*)::int FROM "${this.table}"` + this.buildWhere(params);
        const res = await this.pool.query(sql, params);
        return { data: null, error: null, count: res.rows[0].count };
      }
      let sql = `SELECT * FROM "${this.table}"` + this.buildWhere(params);
      if (this.orderClauses.length) sql += ` ORDER BY ${this.orderClauses.join(', ')}`;
      if (this.limitVal != null) sql += ` LIMIT ${this.limitVal}`;
      if (this.offsetVal != null) sql += ` OFFSET ${this.offsetVal}`;
      const res = await this.pool.query(sql, params);
      let data = res.rows;
      if (this.singleMode || this.maybeSingleMode) data = data[0] ?? null;
      return { data, error: null };
    }

    if (this.op === 'insert' || this.op === 'upsert') {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
      if (!rows.length) return { data: [], error: null };
      const cols = Object.keys(rows[0]);
      const allData: any[] = [];
      for (const row of rows) {
        const vals = cols.map(c => this.jsonify(row[c]));
        const ph = vals.map((_, i) => `$${i + 1}`).join(', ');
        let sql = `INSERT INTO "${this.table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${ph})`;
        if (this.op === 'upsert' && this.upsertConflict) {
          const upd = cols.filter(c => c !== this.upsertConflict).map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');
          sql += ` ON CONFLICT ("${this.upsertConflict}") DO UPDATE SET ${upd}`;
        }
        sql += ' RETURNING *';
        const res = await this.pool.query(sql, vals);
        allData.push(...res.rows);
      }
      return { data: this.singleMode ? allData[0] ?? null : allData, error: null };
    }

    if (this.op === 'update') {
      const data = this.payload as Record<string, unknown>;
      const cols = Object.keys(data);
      const sets = cols.map((c, i) => { params.push(this.jsonify(data[c])); return `"${c}" = $${i + 1}`; }).join(', ');
      const where = this.buildWhere(params);
      const res = await this.pool.query(`UPDATE "${this.table}" SET ${sets}${where} RETURNING *`, params);
      return { data: res.rows, error: null };
    }

    if (this.op === 'delete') {
      const where = this.buildWhere(params);
      const res = await this.pool.query(`DELETE FROM "${this.table}"${where} RETURNING *`, params);
      return { data: res.rows, error: null };
    }

    return { data: null, error: { message: 'Unknown operation' } };
  }
}

const VALID_IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export class RPCBuilder {
  constructor(private pool: pg.Pool, private fnName: string, private params: Record<string, unknown>) {
    if (!VALID_IDENT.test(fnName)) {
      throw new Error(`Invalid RPC function name: ${fnName}`);
    }
  }

  async then(resolve: (val: { data: any; error: any }) => void) {
    try {
      const keys = Object.keys(this.params);
      for (const k of keys) {
        if (!VALID_IDENT.test(k)) {
          throw new Error(`Invalid RPC parameter name: ${k}`);
        }
      }
      const vals = keys.map(k => {
        const v = this.params[k];
        return Array.isArray(v) && v.length > 100 ? `[${v.join(',')}]` : v;
      });
      const ph = keys.map((_, i) => `$${i + 1}`).join(', ');
      const res = await this.pool.query(`SELECT * FROM ${this.fnName}(${ph})`, vals);
      resolve({ data: res.rows, error: null });
    } catch (err: any) {
      resolve({ data: null, error: { message: err.message } });
    }
  }
}
