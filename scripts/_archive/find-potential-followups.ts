import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Potential follow-up pairs based on progression logic
const potentialFollowups = [
  // Impact play progression
  { base: 'spanking', followups: ['whipping', 'caning'], reason: 'intensity progression' },

  // Oral progression
  { base: 'blowjob', followups: ['deepthroat', 'facefuck'], reason: 'intensity progression' },
  { base: 'cunnilingus', followups: ['facesitting'], reason: 'position variation' },

  // Bondage progression
  { base: 'bondage', followups: ['shibari', 'mummification'], reason: 'intensity/complexity progression' },

  // Anal progression
  { base: 'anal', followups: ['fisting', 'double-penetration'], reason: 'intensity progression' },

  // Power exchange progression
  { base: 'collar', followups: ['pet-play', 'leash'], reason: 'depth of dynamic' },

  // Sensory progression
  { base: 'blindfold', followups: ['sensory-deprivation'], reason: 'intensity' },
  { base: 'wax', followups: ['ice', 'electrostim'], reason: 'sensation variety' },

  // Degradation progression
  { base: 'dirty-talk', followups: ['degradation', 'humiliation'], reason: 'intensity' },

  // Rough progression
  { base: 'rough-sex', followups: ['cnc', 'primal'], reason: 'intensity/dynamic' },

  // Group progression
  { base: 'threesome', followups: ['gangbang', 'orgy'], reason: 'number of participants' },
];

async function findScenes() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, category, intensity, is_active')
    .eq('is_active', true)
    .is('paired_with', null) // Only base scenes
    .order('slug');

  console.log('=== POTENTIAL FOLLOW-UP CANDIDATES ===\n');

  for (const pair of potentialFollowups) {
    const baseScene = scenes?.find(s => s.slug.includes(pair.base) && !s.slug.includes('-give') && !s.slug.includes('-receive'));
    const followupScenes = pair.followups.map(f =>
      scenes?.find(s => s.slug.includes(f) && !s.slug.includes('-give') && !s.slug.includes('-receive'))
    ).filter(Boolean);

    if (baseScene && followupScenes.length > 0) {
      console.log(`BASE: ${baseScene.slug} (intensity: ${baseScene.intensity})`);
      console.log(`  Reason: ${pair.reason}`);
      console.log(`  Follow-ups:`);
      for (const f of followupScenes) {
        console.log(`    - ${f!.slug} (intensity: ${f!.intensity})`);
      }
      console.log('');
    }
  }
}

findScenes();
