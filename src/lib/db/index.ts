import pg from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { DB } from './schema';

const { Pool } = pg;

let _pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (_pool) return _pool;
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('Missing DATABASE_URL');
  _pool = new Pool({ connectionString: url, max: 10 });
  return _pool;
}

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({ pool: getPool() }),
});

export function getDbPool(): pg.Pool {
  return getPool();
}
