const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fs = require('fs');

const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || 'http://173.242.60.76:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
});

const BUCKETS = ['scenes', 'scene-variants', 'avatars'];

async function listBucket(bucket) {
  const keys = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
    (res.Contents || []).forEach(o => keys.push({ key: o.Key, size: o.Size, modified: o.LastModified }));
    token = res.IsTruncated ? res.NextContinuationToken : null;
  } while (token);
  return keys;
}

(async () => {
  const all = {};
  for (const b of BUCKETS) {
    try {
      const keys = await listBucket(b);
      all[b] = keys;
      const totalSize = keys.reduce((s, k) => s + k.size, 0);
      console.log(`${b}: ${keys.length} objects, ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
    } catch (e) {
      console.log(`${b}: ERROR — ${e.name}: ${e.message}`);
    }
  }
  fs.writeFileSync('/tmp/nexy-minio-keys.json', JSON.stringify(all, null, 2));
  console.log('wrote /tmp/nexy-minio-keys.json');
})().catch(e => { console.error(e); process.exit(1); });
