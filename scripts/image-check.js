const fs = require('fs');
const http = require('http');
const https = require('https');

const urls = fs.readFileSync('/tmp/nexy-image-urls.txt', 'utf8').split('\n').filter(Boolean);
console.log('Checking', urls.length, 'URLs...');

async function check(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const lib = u.protocol === 'https:' ? https : http;
      const req = lib.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
        resolve({ url, status: res.statusCode });
        res.resume();
      });
      req.on('error', (e) => resolve({ url, status: 0, err: e.code || e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ url, status: 0, err: 'timeout' }); });
      req.end();
    } catch (e) {
      resolve({ url, status: 0, err: 'bad-url:' + e.message });
    }
  });
}

const CONC = 20;
let idx = 0;
const results = [];

async function worker() {
  while (idx < urls.length) {
    const i = idx++;
    const r = await check(urls[i]);
    results.push(r);
    if (results.length % 100 === 0) process.stdout.write('.');
  }
}

(async () => {
  await Promise.all(Array.from({ length: CONC }, () => worker()));
  console.log('');
  const byStatus = {};
  results.forEach(r => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
  console.log('Status breakdown:', byStatus);
  const broken = results.filter(r => r.status !== 200);
  console.log('Non-200:', broken.length);
  if (broken.length > 0) {
    console.log('Sample of first 20 broken:');
    broken.slice(0, 20).forEach(r => console.log(' ', r.status || r.err, r.url));
    fs.writeFileSync('/tmp/nexy-broken-urls.txt', broken.map(r => `${r.status || r.err}\t${r.url}`).join('\n'));
    console.log('wrote /tmp/nexy-broken-urls.txt');
  }
})();
