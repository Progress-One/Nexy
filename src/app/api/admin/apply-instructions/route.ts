import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applyInstructionsToPrompt } from '@/lib/prompt-rewriter';
import { requireAdmin } from '@/lib/auth';

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { sceneId, instructions } = await req.json();

    if (!sceneId || !instructions) {
      return NextResponse.json(
        { error: 'Missing sceneId or instructions' },
        { status: 400 }
      );
    }

    // Get current scene
    const scene = await db
      .selectFrom('scenes')
      .select(['generation_prompt', 'prompt_instructions'])
      .where('id', '=', sceneId)
      .executeTakeFirst();

    if (!scene) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    const currentPrompt = scene.generation_prompt;
    if (!currentPrompt) {
      return NextResponse.json(
        { error: 'No generation_prompt to modify' },
        { status: 400 }
      );
    }

    console.log('[ApplyInstructions] Applying to scene:', sceneId);
    console.log('[ApplyInstructions] Current prompt:', currentPrompt.substring(0, 100));
    console.log('[ApplyInstructions] Instructions:', instructions);

    // Apply instructions using AI
    const result = await applyInstructionsToPrompt(currentPrompt, instructions);

    console.log('[ApplyInstructions] New prompt:', result.newPrompt.substring(0, 100));
    console.log('[ApplyInstructions] Changes:', result.changes);

    // Update scene with new prompt AND save instructions
    await db
      .updateTable('scenes')
      .set({
        generation_prompt: result.newPrompt,
        prompt_instructions: instructions,
      })
      .where('id', '=', sceneId)
      .execute();

    return NextResponse.json({
      success: true,
      newPrompt: result.newPrompt,
      changes: result.changes,
    });
  } catch (error) {
    console.error('[ApplyInstructions] Exception:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
