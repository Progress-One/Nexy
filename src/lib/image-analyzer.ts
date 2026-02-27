/**
 * Image Analyzer using Replicate LLaVA
 * Analyzes erotic/intimate images and extracts structured data for scene matching
 */

import Replicate from 'replicate';

// LLaVA 13B - good balance of quality and speed, NSFW-safe
const LLAVA_MODEL = 'yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb';

let replicateClient: Replicate | null = null;

function getClient(): Replicate {
  if (!replicateClient) {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN is not set');
    }
    replicateClient = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }
  return replicateClient;
}

export interface ImageAnalysisFlags {
  anatomyIssues: boolean;      // Extra fingers, wrong body parts, unnatural poses
  anatomyDetails?: string;     // Description of the issue
  sameGenderOnly: boolean;     // Only male or only female (homo/lesbian)
  nonSexual: boolean;          // No sexual content or context
}

export interface ImageAnalysis {
  participants: { count: number; genders: string[] };
  activity: string;
  keywords: string[];          // Extended: 8-12 keywords
  mood: string;
  setting: string;
  elements: string[];
  bodyParts: string[];         // Visible body parts
  clothing: string[];          // Clothing/accessories
  intensity: 'soft' | 'medium' | 'explicit';  // Content intensity level
  position?: string;           // Sexual position if applicable
  perspective: string;         // Camera angle: POV, wide, close-up, etc.
  facesVisible: boolean;       // Whether faces are shown
  flags: ImageAnalysisFlags;   // Quality/content flags
}

const ANALYSIS_PROMPT = `You are analyzing an erotic/intimate image. Extract detailed structured data.

## EXTRACTION RULES

**PARTICIPANTS**
- Count all visible people (1, 2, 3+)
- Identify each person's gender: "male" or "female"
- Example: 2 people = ["male", "female"] or ["female", "female"]

**ACTIVITY** - Describe the main action:
- Foreplay: kissing, caressing, undressing, massage
- Oral: blowjob, cunnilingus, 69
- Manual: handjob, fingering, masturbation
- Penetration: vaginal sex, anal sex
- BDSM: bondage, spanking, domination
- Other: posing, teasing, watching

**POSITION** (if sexual activity):
missionary, doggy style, cowgirl, reverse cowgirl, spooning, standing, 69, sitting, kneeling, against wall, on table, etc.

**INTENSITY**:
- "soft" = kissing, cuddling, teasing, implied nudity, artistic
- "medium" = nudity, touching genitals, oral, clear sexual activity
- "explicit" = penetration visible, close-up genitals, hardcore

**PERSPECTIVE** - Camera angle:
POV (first person), wide shot, close-up, from above, from below, side view, from behind

**FACES**: Are faces clearly visible? true/false

**KEYWORDS** - Pick 8-12 from these categories:
- Actions: kissing, licking, sucking, penetration, fingering, spanking, choking, biting
- Body focus: breasts, ass, pussy, cock, feet, hands, lips, neck
- Style: romantic, passionate, rough, gentle, dominant, submissive, playful, sensual
- Context: bedroom, shower, outdoor, office, car, hotel, pool

## QUALITY FLAGS - Check VERY carefully for AI generation artifacts:

**anatomyIssues** = true if ANY of these problems:
- FINGERS: Count fingers on each visible hand - should be exactly 5. Flag if more or fewer fingers, fused fingers, extra thumbs, fingers at wrong angles
- LIMBS: Extra arms/legs, missing limbs, limbs attached at wrong places, limbs that go through other body parts
- BODY MERGE: Bodies fused together where they shouldn't be, unclear where one person ends and another begins
- IMPOSSIBLE POSES: Body bent in ways human spine cannot bend, joints twisted impossibly, limbs at physically impossible angles
- PROPORTIONS: Hands too big/small, arms different lengths, head wrong size, torso too long/short
- GENITALS: Distorted, wrong position, merged with other body parts
- FACES: Multiple faces merged, features in wrong positions, asymmetric in unnatural ways

**sameGenderOnly** = true if ONLY males (gay) or ONLY females (lesbian) - no mixed genders

**nonSexual** = true if NO erotic/sexual content (just portrait, landscape, clothed people, etc.)

## RESPOND WITH JSON ONLY:

{
  "participants": { "count": 2, "genders": ["male", "female"] },
  "activity": "woman giving oral sex to man",
  "position": "kneeling",
  "intensity": "medium",
  "perspective": "side view",
  "facesVisible": true,
  "mood": "passionate",
  "setting": "bedroom",
  "keywords": ["blowjob", "oral", "kneeling", "passionate", "bedroom", "nude", "intimate", "sensual"],
  "bodyParts": ["breasts", "hands", "penis"],
  "clothing": ["none"],
  "elements": ["bed", "pillows"],
  "flags": {
    "anatomyIssues": false,
    "anatomyDetails": "null OR describe the specific anatomy problem found",
    "sameGenderOnly": false,
    "nonSexual": false
  }
}`;

/**
 * Analyze an image and extract structured data for scene matching
 */
export async function analyzeImage(imageUrl: string): Promise<ImageAnalysis> {
  const client = getClient();

  console.log('[Image-Analyzer] Analyzing image:', imageUrl.substring(0, 80) + '...');

  try {
    const output = await client.run(LLAVA_MODEL as `${string}/${string}:${string}`, {
      input: {
        image: imageUrl,
        prompt: ANALYSIS_PROMPT,
        max_tokens: 1024,
        temperature: 0.3, // Low temperature for consistent structured output
      },
    });

    // Handle different output types from Replicate
    let responseText = '';

    if (typeof output === 'string') {
      responseText = output;
    } else if (Array.isArray(output)) {
      responseText = output.join('');
    } else if (output && typeof output === 'object' && Symbol.asyncIterator in output) {
      for await (const chunk of output as AsyncIterable<string>) {
        responseText += chunk;
      }
    } else {
      responseText = String(output);
    }

    console.log('[Image-Analyzer] Raw response:', responseText.substring(0, 300) + '...');

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Image-Analyzer] Could not find JSON in response:', responseText);
      throw new Error('Could not parse LLaVA response - no JSON found');
    }

    let analysis: ImageAnalysis;
    try {
      analysis = JSON.parse(jsonMatch[0]) as ImageAnalysis;
    } catch (parseError) {
      // Try to fix common JSON issues
      console.warn('[Image-Analyzer] JSON parse failed, attempting to fix...', (parseError as Error).message);
      const fixedJson = jsonMatch[0]
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Fix unquoted keys
        .replace(/:\s*'([^']*)'/g, ': "$1"'); // Replace single quotes with double quotes

      try {
        analysis = JSON.parse(fixedJson) as ImageAnalysis;
        console.log('[Image-Analyzer] Successfully fixed and parsed JSON');
      } catch (secondError) {
        console.error('[Image-Analyzer] Could not fix JSON:', fixedJson.substring(0, 200));
        throw new Error(`Could not parse LLaVA response: ${(parseError as Error).message}`);
      }
    }

    // Validate and normalize the response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = analysis as any;
    const normalized: ImageAnalysis = {
      participants: {
        count: analysis.participants?.count || 1,
        genders: Array.isArray(analysis.participants?.genders) ? analysis.participants.genders : [],
      },
      activity: analysis.activity || 'unknown activity',
      keywords: Array.isArray(analysis.keywords) ? analysis.keywords : [],
      mood: analysis.mood || 'unknown',
      setting: analysis.setting || 'unknown',
      elements: Array.isArray(analysis.elements) ? analysis.elements : [],
      bodyParts: Array.isArray(analysis.bodyParts) ? analysis.bodyParts : [],
      clothing: Array.isArray(analysis.clothing) ? analysis.clothing : [],
      intensity: (['soft', 'medium', 'explicit'].includes(raw.intensity) ? raw.intensity : 'medium'),
      position: typeof raw.position === 'string' ? raw.position : undefined,
      perspective: typeof raw.perspective === 'string' ? raw.perspective : 'wide shot',
      facesVisible: Boolean(raw.facesVisible),
      flags: {
        anatomyIssues: Boolean(analysis.flags?.anatomyIssues),
        anatomyDetails: analysis.flags?.anatomyDetails || undefined,
        sameGenderOnly: Boolean(analysis.flags?.sameGenderOnly),
        nonSexual: Boolean(analysis.flags?.nonSexual),
      },
    };

    // Auto-detect same-gender based on participants if not flagged
    if (!normalized.flags.sameGenderOnly && normalized.participants.genders.length > 0) {
      const uniqueGenders = new Set(normalized.participants.genders.map(g => g.toLowerCase()));
      if (uniqueGenders.size === 1 && normalized.participants.count >= 2) {
        normalized.flags.sameGenderOnly = true;
      }
    }

    console.log('[Image-Analyzer] Analysis result:', {
      participants: normalized.participants,
      activity: normalized.activity,
      intensity: normalized.intensity,
      position: normalized.position,
      perspective: normalized.perspective,
      keywords: normalized.keywords,
      flags: normalized.flags,
    });

    return normalized;
  } catch (error) {
    console.error('[Image-Analyzer] Error:', error);
    throw new Error(`Image analysis failed: ${(error as Error).message}`);
  }
}
