import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const openai = new OpenAI();

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sceneId, feedback } = await req.json();

  // Get scene tags
  const scene = await db
    .selectFrom('scenes')
    .select('tags')
    .where('id', '=', sceneId)
    .executeTakeFirst();

  if (!scene?.tags?.length) {
    return NextResponse.json({ category: null, confidence: 0 });
  }

  // Get categories for these tags
  const tagCats = await db
    .selectFrom('tag_categories as tc')
    .leftJoin('categories as c', 'c.id', 'tc.category_id')
    .select([
      'tc.tag',
      'c.slug as category_slug',
      'c.name as category_name',
    ])
    .where('tc.tag', 'in', scene.tags)
    .execute();

  const categories = [...new Set(
    tagCats.map(tc => tc.category_slug).filter(Boolean)
  )] as string[];

  if (!categories.length) {
    return NextResponse.json({ category: null, confidence: 0 });
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Determine which category the user wants to exclude based on their feedback.
Scene categories: ${categories.join(', ')}
Scene tags: ${scene.tags.join(', ')}

Respond with JSON: {"category": "slug or null", "confidence": 0-100, "level": "soft|hard"}

Rules:
- If user says something like "not my thing" or "don't like this" - it's probably "hard" exclusion
- If user says "maybe later" or "not now" - it's "soft"
- Match feedback to the most likely category
- If unclear, set category to null`
      },
      { role: 'user', content: feedback }
    ],
    response_format: { type: 'json_object' }
  });

  try {
    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ category: null, confidence: 0, level: 'soft' });
  }
}
