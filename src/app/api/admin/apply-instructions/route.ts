import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/compat-types';
import { applyInstructionsToPrompt } from '@/lib/prompt-rewriter';
import { requireAdmin } from '@/lib/admin-auth';

// Use service role for admin operations (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { sceneId, instructions } = await req.json();

    if (!sceneId || !instructions) {
      return NextResponse.json(
        { error: 'Missing sceneId or instructions' },
        { status: 400 }
      );
    }

    // Get current scene
    const { data: scene, error: selectError } = await supabase
      .from('scenes')
      .select('generation_prompt, prompt_instructions')
      .eq('id', sceneId)
      .single();

    if (selectError || !scene) {
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
    const { error: updateError } = await supabase
      .from('scenes')
      .update({
        generation_prompt: result.newPrompt,
        prompt_instructions: instructions,
      })
      .eq('id', sceneId);

    if (updateError) {
      console.error('[ApplyInstructions] Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

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
