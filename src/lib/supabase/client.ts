/**
 * Browser client for Nexy — drop-in replacement for @supabase/ssr createBrowserClient.
 * Auth proxies through /api/auth/* routes.
 * DB queries proxy through /api/db route (server-side execution).
 */

class BrowserQueryBuilder {
  private table: string;
  private _select = '*';
  private filters: { col: string; op: string; val: unknown }[] = [];
  private _order: { col: string; asc: boolean }[] = [];
  private _limit?: number;
  private _single = false;

  constructor(table: string) { this.table = table; }

  select(cols = '*', _opts?: any) { this._select = cols; return this; }
  eq(col: string, val: unknown) { this.filters.push({ col, op: 'eq', val }); return this; }
  neq(col: string, val: unknown) { this.filters.push({ col, op: 'neq', val }); return this; }
  gt(col: string, val: unknown) { this.filters.push({ col, op: 'gt', val }); return this; }
  gte(col: string, val: unknown) { this.filters.push({ col, op: 'gte', val }); return this; }
  lt(col: string, val: unknown) { this.filters.push({ col, op: 'lt', val }); return this; }
  lte(col: string, val: unknown) { this.filters.push({ col, op: 'lte', val }); return this; }
  in(col: string, vals: unknown[]) { this.filters.push({ col, op: 'in', val: vals }); return this; }
  is(col: string, val: unknown) { this.filters.push({ col, op: 'is', val }); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this._order.push({ col, asc: opts?.ascending !== false }); return this; }
  limit(n: number) { this._limit = n; return this; }
  single() { this._single = true; this._limit = 1; return this; }
  maybeSingle() { this._single = true; this._limit = 1; return this; }

  insert(data: any) { return this._mutate('insert', data); }
  update(data: any) { return this._mutate('update', data); }
  upsert(data: any, opts?: any) { return this._mutate('upsert', data, opts); }
  delete() { return this._mutate('delete', null); }

  private async _mutate(op: string, data: any, opts?: any) {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: this.table, op, data, filters: this.filters, opts }),
    });
    const json = await res.json();
    return { data: json.data, error: json.error };
  }

  async then(resolve: (val: { data: any; error: any }) => void) {
    try {
      const params = new URLSearchParams({
        table: this.table,
        select: this._select,
        filters: JSON.stringify(this.filters),
        order: JSON.stringify(this._order),
        ...(this._limit != null ? { limit: String(this._limit) } : {}),
        ...(this._single ? { single: '1' } : {}),
      });
      const res = await fetch(`/api/db?${params}`);
      const json = await res.json();
      resolve({ data: json.data, error: json.error });
    } catch (err: any) {
      resolve({ data: null, error: { message: err.message } });
    }
  }
}

export function createClient() {
  return {
    auth: {
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) { const d = await res.json(); return { error: { message: d.error || 'Login failed' } }; }
        return { error: null };
      },
      signUp: async ({ email, password }: { email: string; password: string }) => {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) { const d = await res.json(); return { data: { user: null }, error: { message: d.error } }; }
        const d = await res.json();
        return { data: { user: d.user }, error: null };
      },
      signOut: async () => { await fetch('/api/auth/logout', { method: 'POST' }); return { error: null }; },
      getUser: async () => {
        const res = await fetch('/api/auth/me');
        if (!res.ok) return { data: { user: null }, error: { message: 'Not authenticated' } };
        const d = await res.json();
        return { data: { user: d.user }, error: null };
      },
    },
    from: (table: string) => new BrowserQueryBuilder(table),
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: File | Buffer, opts?: any) => {
          const formData = new FormData();
          formData.append('file', file instanceof File ? file : new Blob([file]));
          formData.append('path', path);
          formData.append('bucket', bucket);
          const res = await fetch('/api/storage/upload', { method: 'POST', body: formData });
          if (!res.ok) return { error: { message: 'Upload failed' } };
          return { data: { path }, error: null };
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `${process.env.NEXT_PUBLIC_MINIO_URL || 'http://173.242.60.76:9000'}/${bucket}/${path}` },
        }),
      }),
    },
  };
}
