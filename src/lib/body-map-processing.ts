import { db } from '@/lib/db';
import type { Json } from '@/lib/db/schema';

// Re-export pure helpers for server-side callers (backward compat).
// Client-side code must import from `body-map-processing-pure` directly to
// avoid pulling the server-only `db` module into the browser bundle.
export * from './body-map-processing-pure';

/**
 * Body Map Processing
 *
 * Converts body map zone+action preferences into:
 * 1. body_map_gates - opens/closes category gates based on zone selections
 * 2. tag_preferences - boosts interest levels for relevant tags
 */

// Zone to gate/tag mappings
const ZONE_TO_GATES: Record<string, string[]> = {
  // Anal zones
  anus: ['anal', 'rimming', 'pegging'],

  // Genital zones
  penis: ['oral', 'handjob', 'cock_worship'],
  vulva: ['oral', 'fingering', 'pussy_worship'],
  groin: ['oral', 'manual'],

  // Feet
  feet: ['foot_worship', 'foot_fetish'],

  // Breasts/chest
  breasts: ['breast_play', 'nipple_play', 'titfuck'],
  nipples: ['nipple_play', 'nipple_clamps'],
  chest: ['body_worship'],

  // Other erogenous
  neck: ['choking', 'kissing', 'biting'],
  ears: ['sensual', 'whispering'],
  lips: ['kissing', 'oral'],

  // Impact zones
  buttocks: ['spanking', 'impact'],
  thighs: ['spanking', 'sensual'],

  // General
  back: ['massage', 'scratching'],
  lower_back: ['massage', 'sensual'],
  shoulders: ['massage', 'biting'],
  stomach: ['body_worship', 'sensual'],
  arms: ['bondage', 'restraint'],
  hands: ['hand_fetish', 'finger_sucking'],
};

// Action to tag mappings
const ACTION_TO_TAGS: Record<string, string[]> = {
  kiss: ['kissing', 'romantic', 'sensual'],
  lick: ['oral', 'licking', 'worship'],
  bite: ['biting', 'pain_play', 'rough'],
  suck: ['oral', 'sucking'],
  spank: ['spanking', 'impact', 'discipline'],
  slap: ['face_slapping', 'impact', 'rough'],
  scratch: ['scratching', 'marking', 'rough'],
  tickle: ['tickling', 'sensory', 'playful'],
  massage: ['massage', 'sensual', 'relaxation'],
  touch: ['sensual', 'caressing'],
  touch_outside: ['sensual', 'teasing', 'anal_external'],
  grab: ['rough', 'dominance', 'grabbing'],
  pinch: ['nipple_play', 'pain_play'],
  pull: ['hair_pulling', 'rough'],
  finger: ['fingering', 'penetration', 'manual'],
  toys: ['toys', 'penetration', 'vibrator'],
  anal_sex: ['anal', 'anal_sex', 'penetration', 'anal_receiving'],
};

// Preference value to score mapping
const PREFERENCE_SCORES: Record<string, number> = {
  love: 80,
  sometimes: 50,
  no: 0,
};

interface BodyMapPass {
  subject: 'give' | 'receive';
  gender?: string;
  zoneActionPreferences?: Record<string, Record<string, 'love' | 'sometimes' | 'no' | null>>;
}

interface BodyMapAnswer {
  passes: BodyMapPass[];
}

/**
 * Process body map answer and update gates + tag_preferences
 */
export async function processBodyMapToGatesAndTags(
  userId: string,
  bodyMapAnswer: BodyMapAnswer,
  sceneSlug: string // e.g., 'bodymap-self', 'bodymap-partner-female'
): Promise<{
  gatesUpdated: string[];
  tagsUpdated: string[];
  errors: string[];
}> {
  const result = {
    gatesUpdated: [] as string[],
    tagsUpdated: [] as string[],
    errors: [] as string[],
  };

  // Collect all gates to open and tag scores to update
  const gatesToOpen: Set<string> = new Set();
  const tagScores: Record<string, {
    interest: number;
    role: 'give' | 'receive' | 'both';
    count: number;
  }> = {};

  // Determine if this is self or partner body map
  const isSelf = sceneSlug.includes('self');

  // Process each pass
  for (const pass of bodyMapAnswer.passes) {
    if (!pass.zoneActionPreferences) continue;

    const subject = pass.subject; // 'give' or 'receive'

    // For self body map: receive = what I like done to me
    // For partner body map: give = what I like doing to partner

    for (const [zoneId, actionPrefs] of Object.entries(pass.zoneActionPreferences)) {
      const zoneGates = ZONE_TO_GATES[zoneId] || [];

      for (const [actionId, preference] of Object.entries(actionPrefs)) {
        if (!preference || preference === 'no') continue;

        const score = PREFERENCE_SCORES[preference] || 0;
        if (score === 0) continue;

        // Open gates based on zone
        for (const gate of zoneGates) {
          gatesToOpen.add(gate);
        }

        // Calculate tag scores
        const actionTags = ACTION_TO_TAGS[actionId] || [];
        const allTags = [...zoneGates, ...actionTags];

        for (const tag of allTags) {
          if (!tagScores[tag]) {
            tagScores[tag] = { interest: 0, role: subject, count: 0 };
          }

          // Accumulate score
          tagScores[tag].interest = Math.max(tagScores[tag].interest, score);
          tagScores[tag].count += 1;

          // Update role preference
          if (tagScores[tag].role !== subject && tagScores[tag].role !== 'both') {
            tagScores[tag].role = 'both';
          }
        }

        // Special zone+action combinations
        if (zoneId === 'anus' && (actionId === 'lick' || actionId === 'kiss')) {
          gatesToOpen.add('rimming');
          tagScores['rimming'] = {
            interest: Math.max(tagScores['rimming']?.interest || 0, score),
            role: subject,
            count: (tagScores['rimming']?.count || 0) + 1,
          };
        }

        if (zoneId === 'buttocks' && actionId === 'spank') {
          gatesToOpen.add('spanking');
          tagScores['spanking'] = {
            interest: Math.max(tagScores['spanking']?.interest || 0, score),
            role: subject,
            count: (tagScores['spanking']?.count || 0) + 1,
          };
        }

        if (zoneId === 'feet' && (actionId === 'kiss' || actionId === 'lick' || actionId === 'massage')) {
          gatesToOpen.add('foot_worship');
          tagScores['foot_worship'] = {
            interest: Math.max(tagScores['foot_worship']?.interest || 0, score),
            role: subject,
            count: (tagScores['foot_worship']?.count || 0) + 1,
          };
        }

        if ((zoneId === 'penis' || zoneId === 'vulva') && (actionId === 'lick' || actionId === 'suck' || actionId === 'kiss')) {
          gatesToOpen.add('oral');
          const oralTag = zoneId === 'penis' ? 'blowjob' : 'cunnilingus';
          tagScores[oralTag] = {
            interest: Math.max(tagScores[oralTag]?.interest || 0, score),
            role: subject,
            count: (tagScores[oralTag]?.count || 0) + 1,
          };
        }

        // Anal sex - opens anal gate and sets anal tags
        if (zoneId === 'anus' && actionId === 'anal_sex') {
          gatesToOpen.add('anal');
          tagScores['anal_sex'] = {
            interest: Math.max(tagScores['anal_sex']?.interest || 0, score),
            role: subject,
            count: (tagScores['anal_sex']?.count || 0) + 1,
          };
          tagScores['anal_receiving'] = {
            interest: Math.max(tagScores['anal_receiving']?.interest || 0, score),
            role: subject,
            count: (tagScores['anal_receiving']?.count || 0) + 1,
          };
        }

        // Anal finger/toys - opens anal gate with lower intensity
        if (zoneId === 'anus' && (actionId === 'finger' || actionId === 'toys')) {
          gatesToOpen.add('anal');
          const analTag = actionId === 'finger' ? 'anal_finger' : 'anal_toys';
          tagScores[analTag] = {
            interest: Math.max(tagScores[analTag]?.interest || 0, score),
            role: subject,
            count: (tagScores[analTag]?.count || 0) + 1,
          };
        }
      }
    }
  }

  // Update body_map_gates in user_gates
  if (gatesToOpen.size > 0) {
    try {
      // Get existing gates
      const existingGates = await db
        .selectFrom('user_gates')
        .select('body_map_gates')
        .where('user_id', '=', userId)
        .executeTakeFirst();

      const currentBodyMapGates = (existingGates?.body_map_gates as Record<string, boolean> | null) ?? {};

      // Merge new gates
      for (const gate of gatesToOpen) {
        currentBodyMapGates[gate] = true;
      }

      // Upsert
      await db
        .insertInto('user_gates')
        .values({
          user_id: userId,
          body_map_gates: currentBodyMapGates as Json,
        })
        .onConflict((oc) =>
          oc.columns(['user_id']).doUpdateSet({
            body_map_gates: currentBodyMapGates as Json,
          })
        )
        .execute();

      result.gatesUpdated = Array.from(gatesToOpen);
    } catch (error) {
      result.errors.push(`Gates exception: ${error}`);
    }
  }

  // Update tag_preferences
  if (Object.keys(tagScores).length > 0) {
    try {
      for (const [tagRef, data] of Object.entries(tagScores)) {
        // Get existing preference
        const existing = await db
          .selectFrom('tag_preferences')
          .selectAll()
          .where('user_id', '=', userId)
          .where('tag_ref', '=', tagRef)
          .executeTakeFirst();

        // Calculate new interest level (keep max)
        const newInterest = Math.max(existing?.interest_level ?? 0, data.interest);

        // Determine role preference
        let rolePreference: 'give' | 'receive' | 'both' = data.role;
        if (existing?.role_preference) {
          if (existing.role_preference !== data.role) {
            rolePreference = 'both';
          }
        }

        // Get source scenes list
        const sourceScenes: string[] = (existing?.source_scenes as string[] | null) ?? [];
        if (!sourceScenes.includes(sceneSlug)) {
          sourceScenes.push(sceneSlug);
        }

        // Upsert tag preference
        try {
          await db
            .insertInto('tag_preferences')
            .values({
              user_id: userId,
              tag_ref: tagRef,
              interest_level: newInterest,
              role_preference: rolePreference,
              source_scenes: sourceScenes,
              updated_at: new Date(),
            })
            .onConflict((oc) =>
              oc.columns(['user_id', 'tag_ref']).doUpdateSet({
                interest_level: newInterest,
                role_preference: rolePreference,
                source_scenes: sourceScenes,
                updated_at: new Date(),
              })
            )
            .execute();
          result.tagsUpdated.push(tagRef);
        } catch (err) {
          result.errors.push(`Tag ${tagRef} error: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (error) {
      result.errors.push(`Tags exception: ${error}`);
    }
  }

  console.log('[BodyMapProcessing] Processed body map:', {
    sceneSlug,
    gatesOpened: result.gatesUpdated,
    tagsUpdated: result.tagsUpdated,
    errors: result.errors,
  });

  return result;
}
