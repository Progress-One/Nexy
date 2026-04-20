import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'landing');

const TOKEN = process.env.REPLICATE_API_TOKEN;
if (!TOKEN) throw new Error('REPLICATE_API_TOKEN not set');

const IMAGES = [
  {
    name: 'step1-swipe',
    prompt: 'Young woman lying in bed scrolling phone, bare shoulders visible above silk sheets, phone screen glowing warm coral light on her skin, dark moody bedroom, intimate sensual atmosphere, shallow depth of field, cinematic photography, warm amber tones, 4k editorial quality',
    aspect_ratio: '4:5',
  },
  {
    name: 'step2-invite',
    prompt: 'Close-up of a couple in intimate moment, man whispering into woman ear from behind, bare skin of neck and shoulders visible, dark moody lighting with warm amber highlights, sensual passionate atmosphere, shallow depth of field, cinematic photography, 4k',
    aspect_ratio: '4:5',
  },
  {
    name: 'step3-match',
    prompt: 'Passionate couple embracing in dark moody lighting, bodies close together, hands on bare skin, faces almost touching, desire and tension, warm amber and deep purple tones, cinematic shallow depth of field, intimate sensual atmosphere, editorial photography, 4k',
    aspect_ratio: '4:5',
  },
];

async function generateImage(imageConfig) {
  console.log(`\n🎨 Generating: ${imageConfig.name}...`);

  const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-2-pro/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: {
        prompt: imageConfig.prompt,
        aspect_ratio: imageConfig.aspect_ratio,
        output_format: 'webp',
        output_quality: 90,
        safety_tolerance: 5,
        prompt_upsampling: true,
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Create failed for ${imageConfig.name}: ${createRes.status} ${err}`);
  }

  const prediction = await createRes.json();
  console.log(`  ⏳ Prediction ID: ${prediction.id}`);

  let result = prediction;
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` },
    });
    result = await pollRes.json();
    process.stdout.write('.');
  }

  if (result.status === 'failed') {
    throw new Error(`Generation failed for ${imageConfig.name}: ${result.error}`);
  }

  console.log(`\n  ✅ Generated!`);

  const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
  console.log(`  📥 Downloading from: ${imageUrl}`);

  const imgRes = await fetch(imageUrl);
  const buffer = Buffer.from(await imgRes.arrayBuffer());

  const outputPath = path.join(OUTPUT_DIR, `${imageConfig.name}.webp`);
  fs.writeFileSync(outputPath, buffer);
  console.log(`  💾 Saved: ${outputPath} (${(buffer.length / 1024).toFixed(0)} KB)`);

  return outputPath;
}

async function main() {
  console.log('🔥 Generating provocative step images via Replicate FLUX 2 Pro');
  console.log(`📁 Output: ${OUTPUT_DIR}\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate all 3 in parallel
  await Promise.all(IMAGES.map(img => generateImage(img)));

  console.log('\n\n🎉 All images generated!');

  const files = fs.readdirSync(OUTPUT_DIR);
  console.log('\nAll landing images:');
  files.forEach(f => {
    const stats = fs.statSync(path.join(OUTPUT_DIR, f));
    console.log(`  ${f} - ${(stats.size / 1024).toFixed(0)} KB`);
  });
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
