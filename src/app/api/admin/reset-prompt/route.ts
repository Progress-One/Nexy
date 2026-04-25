import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { sceneId, imagePrompt } = await req.json();

    console.log('[ResetPrompt] Request:', {
      sceneId,
      imagePrompt_start: imagePrompt?.substring(0, 80),
      imagePrompt_length: imagePrompt?.length,
    });

    if (!sceneId || !imagePrompt) {
      return NextResponse.json(
        { error: 'Missing sceneId or imagePrompt' },
        { status: 400 }
      );
    }

    const rows = await db
      .updateTable('scenes')
      .set({
        generation_prompt: imagePrompt,
        qa_status: null,
        qa_attempts: null,
        qa_last_assessment: null,
      })
      .where('id', '=', sceneId)
      .returning(['id', 'slug', 'generation_prompt', 'image_prompt'])
      .execute();

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    console.log('[ResetPrompt] Updated scene:', {
      slug: rows[0].slug,
      generation_prompt_start: rows[0].generation_prompt?.substring(0, 80),
      image_prompt_start: rows[0].image_prompt?.substring(0, 80),
      prompts_match: rows[0].generation_prompt === rows[0].image_prompt,
    });

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('[ResetPrompt] Exception:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
