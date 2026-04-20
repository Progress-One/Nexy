const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const files = [
  'electrostim-m-to-f.json',
  'electrostim-m-to-f-receive.json',
  'electrostim-f-to-m.json',
  'electrostim-f-to-m-receive.json',
];

async function main() {
  const scenesDir = path.join(__dirname, '..', 'scenes', 'v2', 'composite', 'sensory');

  for (const file of files) {
    const filePath = path.join(scenesDir, file);
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Check if already exists
    const { data: existing } = await supabase
      .from('scenes')
      .select('id, slug')
      .eq('slug', json.slug)
      .single();

    if (existing) {
      console.log(`SKIP: ${json.slug} already exists (id: ${existing.id})`);
      continue;
    }

    const scene = {
      slug: json.slug,
      version: json.version,
      scene_type: json.scene_type,
      is_active: json.is_active,
      is_onboarding: json.is_onboarding,
      for_gender: json.for_gender,
      paired_scene: json.paired_scene,
      role_direction: json.role_direction,
      title: json.title,
      subtitle: json.subtitle,
      user_description: json.user_description,
      ai_description: json.ai_description,
      image_prompt: json.image_prompt,
      intensity: json.intensity,
      category: json.category,
      tags: json.tags,
      ai_context: json.ai_context,
      question: json.question,
      clarification_for: json.clarification_for,
    };

    const { data, error } = await supabase
      .from('scenes')
      .insert(scene)
      .select('id, slug');

    if (error) {
      console.log(`ERROR: ${json.slug}: ${error.message}`);
    } else {
      console.log(`OK: ${json.slug} (id: ${data[0].id})`);
    }
  }

  console.log('\nDone.');
}

main().catch(console.error);
