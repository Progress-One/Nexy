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
    name: 'hero',
    prompt: 'Intimate couple in dark moody lighting, close together, hands touching, passionate embrace, cinematic photography style, shallow depth of field, warm amber and deep purple tones, dark background, sensual atmosphere, adults only, high fashion editorial style, 4k quality',
    aspect_ratio: '3:4',
  },
  {
    name: 'step1-swipe',
    prompt: 'Close-up of feminine hands holding a smartphone in dark ambient lighting, screen glowing softly with warm coral light, intimate bedroom setting with silk sheets, moody dark atmosphere, shallow depth of field, cinematic style, 4k',
    aspect_ratio: '4:5',
  },
  {
    name: 'step2-invite',
    prompt: 'Two smartphones on dark satin fabric, one sending a glowing message to the other, intimate dark lighting, coral and purple ambient light, mysterious and sensual atmosphere, product photography style, 4k',
    aspect_ratio: '4:5',
  },
  {
    name: 'step3-match',
    prompt: 'Couple holding hands in dramatic dark lighting, only hands and forearms visible, intertwined fingers, warm skin tones against deep dark background, intimate passionate moment, cinematic shallow depth of field, moody amber and purple lighting, 4k',
    aspect_ratio: '4:5',
  },
  {
    name: 'features-bg',
    prompt: 'Abstract dark sensual texture, flowing silk fabric in deep purple and coral red, dramatic lighting from the side, moody intimate atmosphere, soft focus, artistic photography, dark background with fabric folds catching light, 4k',
    aspect_ratio: '16:9',
  },
];

async function generateImage(imageConfig) {
  console.log(`\n🎨 Generating: ${imageConfig.name}...`);

  // Create prediction
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

  // Poll for completion
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

  // Download image
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
  console.log('🚀 Generating landing page images via Replicate FLUX 2 Pro');
  console.log(`📁 Output: ${OUTPUT_DIR}\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate all images in parallel (max 3 concurrent)
  const batchSize = 3;
  for (let i = 0; i < IMAGES.length; i += batchSize) {
    const batch = IMAGES.slice(i, i + batchSize);
    await Promise.all(batch.map(img => generateImage(img)));
  }

  console.log('\n\n🎉 All images generated successfully!');

  // List files
  const files = fs.readdirSync(OUTPUT_DIR);
  console.log('\nGenerated files:');
  files.forEach(f => {
    const stats = fs.statSync(path.join(OUTPUT_DIR, f));
    console.log(`  ${f} - ${(stats.size / 1024).toFixed(0)} KB`);
  });
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
