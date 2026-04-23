import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

let _s3: S3Client | null = null;
function getS3(): S3Client {
  if (_s3) return _s3;
  _s3 = new S3Client({
    endpoint: process.env['MINIO_ENDPOINT'] || 'http://173.242.60.76:9000',
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env['MINIO_ACCESS_KEY'] || 'admin',
      secretAccessKey: process.env['MINIO_SECRET_KEY'] || 'JxX9ml-3coRzS501ZdddT25xykItNj1X',
    },
    forcePathStyle: true,
  });
  return _s3;
}

export async function uploadToStorage(
  bucket: string,
  path: string,
  body: Buffer | File,
  opts?: { contentType?: string }
): Promise<{ path: string }> {
  const buffer = body instanceof File ? Buffer.from(await body.arrayBuffer()) : body;
  await getS3().send(new PutObjectCommand({
    Bucket: bucket,
    Key: path,
    Body: buffer,
    ContentType: opts?.contentType || 'image/webp',
  }));
  return { path };
}

export function getStoragePublicUrl(bucket: string, path: string): string {
  return `${process.env['MINIO_PUBLIC_URL'] || 'http://173.242.60.76:9000'}/${bucket}/${path}`;
}

export interface StorageFile {
  name: string;
  size?: number;
  created_at?: string;
}

export async function listStorageFiles(
  bucket: string,
  opts?: { limit?: number; prefix?: string }
): Promise<StorageFile[]> {
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    MaxKeys: opts?.limit || 1000,
    Prefix: opts?.prefix,
  });
  const result = await getS3().send(command);
  const files: StorageFile[] = [];
  for (const obj of result.Contents || []) {
    if (!obj.Key) continue;
    files.push({
      name: obj.Key,
      size: obj.Size,
      created_at: obj.LastModified?.toISOString(),
    });
  }
  return files;
}
