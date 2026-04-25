const fs = require('fs');

const dbUrls = fs.readFileSync('/tmp/nexy-image-urls.txt', 'utf8').split('\n').filter(Boolean);
const minio = JSON.parse(fs.readFileSync('/tmp/nexy-minio-keys.json', 'utf8'));

// Extract keys from DB URLs
const dbKeys = new Set();
for (const url of dbUrls) {
  try {
    const u = new URL(url);
    // strip leading slash, strip bucket prefix if path-style URL
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0] === 'scenes') {
      dbKeys.add(parts.slice(1).join('/'));
    }
  } catch {}
}

const diskKeys = new Set(minio.scenes.map(o => o.key));

const onlyInDb = [...dbKeys].filter(k => !diskKeys.has(k));
const onlyOnDisk = [...diskKeys].filter(k => !dbKeys.has(k));

console.log('DB-referenced keys:', dbKeys.size);
console.log('Disk keys:', diskKeys.size);
console.log('Referenced in DB but missing on disk:', onlyInDb.length);
console.log('On disk but not referenced in DB (orphans):', onlyOnDisk.length);

if (onlyInDb.length > 0) {
  console.log('\nSample missing (DB → no file):');
  onlyInDb.slice(0, 10).forEach(k => console.log(' ', k));
}
if (onlyOnDisk.length > 0) {
  const totalSize = onlyOnDisk.reduce((s, k) => {
    const o = minio.scenes.find(x => x.key === k);
    return s + (o ? o.size : 0);
  }, 0);
  console.log(`\nOrphans (${onlyOnDisk.length} files, ${(totalSize / 1024 / 1024).toFixed(1)} MB):`);
  onlyOnDisk.slice(0, 10).forEach(k => console.log(' ', k));
  if (onlyOnDisk.length > 10) console.log(`  ... and ${onlyOnDisk.length - 10} more`);
}
