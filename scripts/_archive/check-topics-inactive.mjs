import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Read topics.json
  const topicsData = JSON.parse(readFileSync('scenes/v2/topics.json', 'utf-8'));

  // Extract all scene IDs from topics.json
  const topicSceneIds = new Set();
  for (const topic of topicsData.topics) {
    for (const scene of topic.scenes) {
      topicSceneIds.add(scene.id);
    }
  }

  console.log('Total scenes in topics.json:', topicSceneIds.size);

  // Get all inactive scenes from DB
  const { data: inactive, error } = await supabase
    .from('scenes')
    .select('slug, is_active')
    .eq('is_active', false);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const inactiveSet = new Set(inactive.map(s => s.slug));

  // Find which scenes from topics.json are inactive
  const inactiveInTopics = [];
  for (const sceneId of topicSceneIds) {
    if (inactiveSet.has(sceneId)) {
      inactiveInTopics.push(sceneId);
    }
  }

  console.log('\nScenes in topics.json that are INACTIVE in DB:');
  inactiveInTopics.sort().forEach(s => console.log('  ' + s));
  console.log('Total:', inactiveInTopics.length);

  // Also check which scenes from topics.json don't exist in DB at all
  const { data: allScenes } = await supabase
    .from('scenes')
    .select('slug');

  const allSlugs = new Set(allScenes.map(s => s.slug));

  const notInDb = [];
  for (const sceneId of topicSceneIds) {
    if (!allSlugs.has(sceneId)) {
      notInDb.push(sceneId);
    }
  }

  if (notInDb.length > 0) {
    console.log('\nScenes in topics.json that DO NOT EXIST in DB:');
    notInDb.sort().forEach(s => console.log('  ' + s));
    console.log('Total:', notInDb.length);
  }
}

main();
