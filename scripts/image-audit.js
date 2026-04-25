const pg = require('pg');
const p = new pg.Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const urls = new Set();
  const variantUrls = new Set();
  const optionUrls = new Set();

  const r1 = await p.query("SELECT image_url FROM scenes WHERE image_url IS NOT NULL AND image_url != ''");
  r1.rows.forEach(r => urls.add(r.image_url));
  console.log('scenes.image_url:', r1.rowCount);

  const r2 = await p.query("SELECT image_variants FROM scenes WHERE image_variants IS NOT NULL");
  let vflat = 0;
  r2.rows.forEach(r => {
    if (Array.isArray(r.image_variants)) {
      r.image_variants.forEach(v => {
        const u = typeof v === 'string' ? v : (v && v.url ? v.url : (v && v.image_url ? v.image_url : null));
        if (u) { variantUrls.add(u); vflat++; }
      });
    }
  });
  console.log('scenes.image_variants (flattened URLs):', vflat, 'unique:', variantUrls.size);

  const r3 = await p.query("SELECT image_options FROM scenes WHERE image_options IS NOT NULL");
  let oflat = 0;
  r3.rows.forEach(r => {
    if (Array.isArray(r.image_options)) {
      r.image_options.forEach(o => {
        const u = typeof o === 'string' ? o : (o && o.url ? o.url : (o && o.image_url ? o.image_url : null));
        if (u) { optionUrls.add(u); oflat++; }
      });
    }
  });
  console.log('scenes.image_options (flattened URLs):', oflat, 'unique:', optionUrls.size);

  // Check image_analysis, saved/hidden storage
  try {
    const r4 = await p.query("SELECT COUNT(*) c FROM image_analysis");
    console.log('image_analysis rows:', r4.rows[0].c);
  } catch (e) { console.log('image_analysis: missing', e.message); }
  try {
    const r5 = await p.query("SELECT COUNT(*) c FROM saved_storage_images");
    console.log('saved_storage_images rows:', r5.rows[0].c);
  } catch (e) {}
  try {
    const r6 = await p.query("SELECT COUNT(*) c FROM hidden_storage_images");
    console.log('hidden_storage_images rows:', r6.rows[0].c);
  } catch (e) {}

  const all = new Set([...urls, ...variantUrls, ...optionUrls]);
  console.log('----');
  console.log('TOTAL UNIQUE URLs:', all.size);
  console.log('  from image_url:', urls.size);
  console.log('  from variants:', variantUrls.size);
  console.log('  from options:', optionUrls.size);

  await p.end();
  // Save URLs for next step
  require('fs').writeFileSync('/tmp/nexy-image-urls.txt', [...all].join('\n'));
  console.log('wrote /tmp/nexy-image-urls.txt');
})().catch(e => { console.error(e.message); process.exit(1); });
