import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Booru tag mappings for common elements
const PARTICIPANT_TAGS: Record<string, string[]> = {
  'm+m': ['2boys', 'yaoi', 'male/male', 'bara', 'male focus', 'muscular male'],
  'm+f': ['1boy', '1girl', 'hetero', 'male/female'],
  'f+f': ['2girls', 'yuri', 'female/female', 'lesbian'],
  'solo_m': ['1boy', 'solo', 'male focus'],
  'solo_f': ['1girl', 'solo', 'female focus'],
  'group': ['multiple boys', 'multiple girls', 'group sex', 'orgy'],
};

const STYLE_TAGS = [
  'masterpiece', 'best quality', 'high resolution', 'detailed',
  'professional', 'cinematic lighting', 'dramatic lighting',
];

const NEGATIVE_TAGS = [
  'child', 'underage', 'minor', 'loli', 'shota',
  'deformed', 'bad anatomy', 'disfigured', 'poorly drawn',
  'mutation', 'mutated', 'extra limb', 'ugly', 'disgusting',
  'blurry', 'watermark', 'text', 'signature',
];

interface SceneData {
  id: string;
  slug: string;
  generation_prompt: string | null;
  ai_context: Record<string, unknown> | null;
  tags: string[];
  role_direction?: string;
}

// Detect participant configuration from scene data
function detectParticipants(scene: SceneData): string {
  // Check role_direction first (V2 scenes)
  if (scene.role_direction) {
    switch (scene.role_direction) {
      case 'm_to_f':
      case 'f_to_m':
        return 'm+f';
      case 'mutual':
        // Need to check tags for gender
        if (scene.tags.some(t => t.includes('gay') || t.includes('yaoi') || t.includes('m/m'))) {
          return 'm+m';
        }
        if (scene.tags.some(t => t.includes('lesbian') || t.includes('yuri') || t.includes('f/f'))) {
          return 'f+f';
        }
        return 'm+f'; // Default mutual to hetero
      case 'solo':
        if (scene.tags.some(t => t.includes('male') || t.includes('him') || t.includes('man'))) {
          return 'solo_m';
        }
        return 'solo_f';
      case 'group':
        return 'group';
      default:
        return 'm+f';
    }
  }

  // Check tags for hints
  const tagStr = scene.tags.join(' ').toLowerCase();
  const promptStr = (scene.generation_prompt || '').toLowerCase();
  const combined = tagStr + ' ' + promptStr;

  if (combined.includes('gay') || combined.includes('yaoi') || combined.includes('m/m') ||
      combined.includes('2boys') || combined.includes('two men') || combined.includes('two males')) {
    return 'm+m';
  }
  if (combined.includes('lesbian') || combined.includes('yuri') || combined.includes('f/f') ||
      combined.includes('2girls') || combined.includes('two women') || combined.includes('two females')) {
    return 'f+f';
  }
  if (combined.includes('solo') || combined.includes('masturbat')) {
    if (combined.includes('male') || combined.includes('man') || combined.includes('him')) {
      return 'solo_m';
    }
    return 'solo_f';
  }
  if (combined.includes('group') || combined.includes('orgy') || combined.includes('gangbang')) {
    return 'group';
  }

  return 'm+f'; // Default
}

// Use AI to suggest appropriate booru tags for a prompt
async function suggestTags(prompt: string, participants: string, aiContext: Record<string, unknown> | null): Promise<string[]> {
  const contextStr = aiContext ? JSON.stringify(aiContext) : '';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `You are a booru tag expert. Given an image generation prompt, suggest appropriate booru-style tags.

Current prompt: "${prompt}"

Participant configuration: ${participants}
Scene context: ${contextStr}

Rules:
1. Return ONLY comma-separated booru tags, nothing else
2. Include tags for: poses, actions, clothing/nudity, setting, mood, body types
3. For ${participants === 'm+m' ? 'male/male content, always include: 2boys, yaoi, bara, male focus, muscular male' :
   participants === 'f+f' ? 'female/female content, always include: 2girls, yuri, lesbian' :
   participants === 'solo_m' ? 'solo male, always include: 1boy, solo, male focus' :
   participants === 'solo_f' ? 'solo female, always include: 1girl, solo, female focus' :
   participants === 'group' ? 'group scenes, always include: multiple boys, multiple girls' :
   'hetero content, include: 1boy, 1girl, hetero'}
4. Add appropriate NSFW tags if the content is explicit
5. Include emotional/mood tags (passionate, intimate, rough, tender, etc.)
6. Include body position tags (on back, from behind, cowgirl, missionary, etc.)
7. Do NOT include quality tags like "masterpiece" - those will be added separately
8. Maximum 20 tags

Example output format:
2boys, yaoi, bara, kissing, shirtless, muscular, bedroom, intimate, romantic, from side`
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return text.split(',').map(t => t.trim()).filter(t => t.length > 0);
}

// Build enriched prompt with booru tags
function buildEnrichedPrompt(originalPrompt: string, booruTags: string[], participants: string): string {
  const participantTags = PARTICIPANT_TAGS[participants] || PARTICIPANT_TAGS['m+f'];

  // Combine all tags, removing duplicates
  const allTags = [...new Set([
    ...STYLE_TAGS.slice(0, 4), // Just the essential quality tags
    ...participantTags,
    ...booruTags,
  ])];

  // Format: tags first, then description
  return `${allTags.join(', ')}, ${originalPrompt}`;
}

export async function GET() {
  try {
    // Fetch all scenes with prompts
    const scenes = await db
      .selectFrom('scenes')
      .select(['id', 'slug', 'generation_prompt', 'ai_context', 'tags', 'role_direction'])
      .where('generation_prompt', 'is not', null)
      .orderBy('slug')
      .execute();

    // Return scenes for preview
    return NextResponse.json({
      total: scenes.length,
      scenes: scenes.map(s => ({
        id: s.id,
        slug: s.slug,
        current_prompt: s.generation_prompt,
        tags: s.tags,
        role_direction: s.role_direction,
        detected_participants: detectParticipants({
          id: s.id || '',
          slug: s.slug || '',
          generation_prompt: s.generation_prompt,
          ai_context: s.ai_context as Record<string, unknown> | null,
          tags: s.tags || [],
          role_direction: s.role_direction || undefined,
        }),
      })),
    });
  } catch (error) {
    console.error('[EnrichPrompts] Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { sceneIds, dryRun = true } = await req.json();

    // Fetch scenes to process
    let query = db
      .selectFrom('scenes')
      .select(['id', 'slug', 'generation_prompt', 'ai_context', 'tags', 'role_direction'])
      .where('generation_prompt', 'is not', null);

    if (sceneIds && sceneIds.length > 0) {
      query = query.where('id', 'in', sceneIds);
    }

    const scenes = await query.orderBy('slug').execute();

    if (!scenes || scenes.length === 0) {
      return NextResponse.json({ error: 'No scenes found' }, { status: 404 });
    }

    const results: Array<{
      id: string;
      slug: string;
      participants: string;
      original_prompt: string;
      suggested_tags: string[];
      enriched_prompt: string;
      updated: boolean;
    }> = [];

    for (const scene of scenes) {
      const sceneData: SceneData = {
        id: scene.id || '',
        slug: scene.slug || '',
        generation_prompt: scene.generation_prompt,
        ai_context: scene.ai_context as Record<string, unknown> | null,
        tags: scene.tags || [],
        role_direction: scene.role_direction || undefined,
      };
      const participants = detectParticipants(sceneData);

      console.log(`[EnrichPrompts] Processing ${scene.slug} (${participants})`);

      // Get AI-suggested tags
      const suggestedTags = await suggestTags(
        scene.generation_prompt || '',
        participants,
        scene.ai_context as Record<string, unknown> | null
      );

      // Build enriched prompt
      const enrichedPrompt = buildEnrichedPrompt(
        scene.generation_prompt || '',
        suggestedTags,
        participants
      );

      const result = {
        id: scene.id || '',
        slug: scene.slug || '',
        participants,
        original_prompt: scene.generation_prompt || '',
        suggested_tags: suggestedTags,
        enriched_prompt: enrichedPrompt,
        updated: false,
      };

      // Update in DB if not dry run
      if (!dryRun) {
        try {
          await db
            .updateTable('scenes')
            .set({ generation_prompt: enrichedPrompt })
            .where('id', '=', scene.id || '')
            .execute();
          result.updated = true;
        } catch (updateError) {
          console.error(`[EnrichPrompts] Failed to update ${scene.slug}:`, updateError);
        }
      }

      results.push(result);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      dryRun,
      total: results.length,
      updated: results.filter(r => r.updated).length,
      results,
    });
  } catch (error) {
    console.error('[EnrichPrompts] Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
