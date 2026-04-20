import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'landing');
const TOKEN = process.env.REPLICATE_API_TOKEN;

const IMAGES = [
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
  const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-2-pro/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
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
  if (!createRes.ok) throw new Error(`Create failed: ${await createRes.text()}`);
  const prediction = await createRes.json();
  console.log(`  ⏳ ID: ${prediction.id}`);

  let result = prediction;
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` },
    });
    result = await pollRes.json();
    process.stdout.write('.');
  }
  if (result.status === 'failed') throw new Error(`Failed: ${result.error}`);
  console.log(`\n  ✅ Generated!`);

  const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
  const imgRes = await fetch(imageUrl);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const outputPath = path.join(OUTPUT_DIR, `${imageConfig.name}.webp`);
  fs.writeFileSync(outputPath, buffer);
  console.log(`  💾 Saved: ${outputPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

await Promise.all(IMAGES.map(img => generateImage(img)));
console.log('\n🎉 Done!');
