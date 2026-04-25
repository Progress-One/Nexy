/**
 * Browser client for Nexy — drop-in replacement for @supabase/ssr createBrowserClient.
 * Auth proxies through /api/auth/* routes.
 * DB queries proxy through /api/db route (server-side execution).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

type MutationOp = 'insert' | 'update' | 'upsert' | 'delete';

class BrowserQueryBuilder {
  private table: string;
  private _select = '*';
  private filters: { col: string; op: string; val: unknown }[] = [];
  private _order: { col: string; asc: boolean }[] = [];
  private _limit?: number;
  private _single = false;
  private _mutation: { op: MutationOp; data: unknown; opts?: any } | null = null;

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
  overlaps(col: string, vals: unknown[]) { this.filters.push({ col, op: 'overlaps', val: vals }); return this; }
  contains(col: string, obj: unknown) { this.filters.push({ col, op: 'contains', val: obj }); return this; }
  not(col: string, op: string, val: unknown) { this.filters.push({ col, op: `not_${op}`, val }); return this; }
  or(conditions: string) { this.filters.push({ col: '__or', op: 'or', val: conditions }); return this; }
  range(from: number, to: number) { this.filters.push({ col: '__range', op: 'range', val: [from, to] }); return this; }
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this._order.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  limit(n: number) { this._limit = n; return this; }
  single() { this._single = true; this._limit = 1; return this; }
  maybeSingle() { this._single = true; this._limit = 1; return this; }

  insert(data: any) { this._mutation = { op: 'insert', data }; return this; }
  update(data: any) { this._mutation = { op: 'update', data }; return this; }
  upsert(data: any, opts?: any) { this._mutation = { op: 'upsert', data, opts }; return this; }
  delete() { this._mutation = { op: 'delete', data: null }; return this; }

  private async _executeMutation(): Promise<{ data: any; error: any }> {
    if (!this._mutation) return { data: null, error: { message: 'No mutation set' } };
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: this.table,
          op: this._mutation.op,
          data: this._mutation.data,
          filters: this.filters,
          opts: this._mutation.opts,
        }),
      });
      const json = await res.json();
      return { data: json.data, error: json.error };
    } catch (err: any) {
      return { data: null, error: { message: err?.message || String(err) } };
    }
  }

  private async _executeSelect(): Promise<{ data: any; error: any }> {
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
      return { data: json.data, error: json.error };
    } catch (err: any) {
      return { data: null, error: { message: err?.message || String(err) } };
    }
  }

  then(onFulfilled: (val: { data: any; error: any }) => any, onRejected?: (reason: any) => any) {
    const promise = this._mutation ? this._executeMutation() : this._executeSelect();
    return promise.then(onFulfilled, onRejected);
  }
}

function _createClient() {
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
      signUp: async (args: { email: string; password: string; options?: any }) => {
        const { email, password } = args;
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
      onAuthStateChange: (_cb: (event: string, session: any) => void) => {
        // No-op on the browser shim — used only by landing header for UI reactivity.
        // Callers expect `{ data: { subscription: { unsubscribe: () => void } } }`.
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
    rpc: async (_fnName: string, _params?: Record<string, unknown>) => {
      // RPC is not exposed via the browser shim; callers should fall back.
      return { data: null, error: { message: 'rpc not available in browser shim' } };
    },
    from: (table: string) => new BrowserQueryBuilder(table),
    storage: {
      from: (bucket: string) => ({
        // Upload route is not implemented. Admin code that needs to upload files
        // should use a dedicated /api/admin/* endpoint (e.g. /api/admin/upload-image).
        upload: async (
          _path: string,
          _file: File | Buffer,
          _opts?: any,
        ): Promise<{ data: { path: string } | null; error: { message: string } | null }> => {
          throw new Error('storage.upload not implemented — use /api/admin/upload-image or a dedicated route');
        },
        // Pure URL builder — no network call, safe to keep.
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `${process.env.NEXT_PUBLIC_MINIO_URL || 'http://173.242.60.76:9000'}/${bucket}/${path}` },
        }),
        // List route is not implemented. Admin pages calling .list() will fail loudly
        // until /api/storage/list (or an admin equivalent) exists.
        list: async (
          _path?: string,
          _opts?: any,
        ): Promise<{ data: Array<{ name: string; created_at: string | null }> | null; error: { message: string } | null }> => {
          throw new Error('storage.list not implemented — add /api/storage/list or a dedicated admin route');
        },
      }),
    },
  };
}

let _client: ReturnType<typeof _createClient> | null = null;

export function createClient() {
  return (_client ??= _createClient());
}

// Test-only escape hatch
export function __resetClientForTests() {
  _client = null;
}
