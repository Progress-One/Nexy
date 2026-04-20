import pg from 'pg';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { QueryBuilder, RPCBuilder } from './pg-query-builder';
import { requireEnv } from '@/lib/env';

const { Pool } = pg;

let _pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (_pool) return _pool;
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('Missing DATABASE_URL');
  _pool = new Pool({ connectionString: url, max: 10 });
  return _pool;
}

/**
 * Drop-in replacement for Supabase server client.
 * Returns object with .from(), .rpc(), .auth, .storage API.
 */
export async function createClient() {
  const pool = getPool();
  const cookieStore = await cookies();

  // Read JWT from cookie
  let currentUser: { id: string; email: string } | null = null;
  const token = cookieStore.get('nexy_session')?.value;
  if (token) {
    try {
      const secret = new TextEncoder().encode(requireEnv('JWT_SECRET'));
      const { payload } = await jwtVerify(token, secret);
      currentUser = { id: payload.sub as string, email: payload.email as string };
    } catch { /* expired/invalid */ }
  }

  return {
    from: (table: string) => new QueryBuilder(pool, table),
    rpc: (fnName: string, params: Record<string, unknown>) => new RPCBuilder(pool, fnName, params),
    auth: {
      getUser: async () => ({
        data: { user: currentUser ? { id: currentUser.id, email: currentUser.email } : null },
        error: currentUser ? null : { message: 'Not authenticated' },
      }),
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, buffer: Buffer, opts?: { contentType?: string }) => {
          // Proxy to MinIO via S3 API
          const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
          const s3 = new S3Client({
            endpoint: process.env['MINIO_ENDPOINT'] || 'http://173.242.60.76:9000',
            region: 'us-east-1',
            credentials: {
              accessKeyId: process.env['MINIO_ACCESS_KEY'] || 'admin',
              secretAccessKey: requireEnv('MINIO_SECRET_KEY'),
            },
            forcePathStyle: true,
          });
          await s3.send(new PutObjectCommand({
            Bucket: bucket,
            Key: path,
            Body: buffer,
            ContentType: opts?.contentType || 'image/webp',
          }));
          return { data: { path }, error: null };
        },
        getPublicUrl: (path: string) => ({
          data: {
            publicUrl: `${process.env['MINIO_PUBLIC_URL'] || 'http://173.242.60.76:9000'}/${bucket}/${path}`,
          },
        }),
      }),
    },
  };
}

export async function createServiceClient() {
  return createClient(); // Same as regular — no RLS on self-hosted
}
